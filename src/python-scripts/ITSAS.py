from typing import List, Optional, Tuple, Union

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

from darts.logging import get_logger, raise_if_not
from darts.models.forecasting.pl_forecasting_module import (
    PLPastCovariatesModule,
    io_processor,
)
from darts.models.forecasting.torch_forecasting_model import PastCovariatesTorchModel
from darts.utils.torch import MonteCarloDropout

logger = get_logger(__name__)

ACTIVATIONS = [
    "ReLU",
    "RReLU",
    "PReLU",
    "ELU",
    "Softplus",
    "Tanh",
    "SELU",
    "LeakyReLU",
    "Sigmoid",
    "GELU",
]


class _Part(nn.Module):
    def __init__(
        self,
        input_chunk_length: int,
        output_chunk_length: int,
        num_layers: int,
        layer_width: int,
        nr_params: int,
        pooling_kernel_size: int,
        n_freq_downsample: int,
        batch_norm: bool,
        dropout: float,
        activation: str,
        MaxPool1d: bool,
    ):
        """
        Параметры
        ----------
        input_chunk_length - Длина входной последовательности, подаваемой на модель.
        output_chunk_length - Длина прогноза модели.
        num_layers - Количество полносвязных слоев в каждой части каждого блока.
        layer_width - Определяет количество нейронов, составляющих каждый полносвязный слой в каждой части каждого блока.
        nr_params - Количество параметров правдоподобия (или 1, если правдоподобие не используется).
        pooling_kernel_size - Размер ядра для начального слоя пуллинга.
        n_freq_downsample - Частота выборки.
        batch_norm - Использовать ли нормализацию по пакетам.
        dropout - Разреженная выборка.
        activation - Функция активации промежуточного слоя.
        MaxPool1d - Использовать пуллинг MaxPool1d. Если False, то используется AvgPool1d.
        
        Входные данные
        ------
        x `(batch_size, input_chunk_length)` - Тензор, содержащий входную последовательность.

        Выходные данные
        -------
        x_hat `(batch_size, input_chunk_length)` - Тензор, содержащий обратный прогноз блока.
        y_hat `(batch_size, output_chunk_length)` - Тензор, содержащий прямой прогноз блока.

        """
        super().__init__()

        self.num_layers = num_layers
        self.layer_width = layer_width
        self.input_chunk_length = input_chunk_length
        self.output_chunk_length = output_chunk_length
        self.nr_params = nr_params
        self.pooling_kernel_size = pooling_kernel_size
        self.n_freq_downsample = n_freq_downsample
        self.batch_norm = batch_norm
        self.dropout = dropout
        self.MaxPool1d = MaxPool1d

        raise_if_not(
            activation in ACTIVATIONS, f"'{activation}' is not in {ACTIVATIONS}"
        )
        self.activation = getattr(nn, activation)()

        n_theta_backcast = max(input_chunk_length // n_freq_downsample, 1)
        n_theta_forecast = max(output_chunk_length // n_freq_downsample, 1)

        pool1d = nn.MaxPool1d if self.MaxPool1d else nn.AvgPool1d
        self.pooling_layer = pool1d(
            kernel_size=self.pooling_kernel_size,
            stride=self.pooling_kernel_size,
            ceil_mode=True,
        )

        in_len = int(np.ceil(input_chunk_length / pooling_kernel_size))
        self.layer_widths = [in_len] + [self.layer_width] * self.num_layers

        layers = []
        for i in range(self.num_layers):
            layers.append(
                nn.Linear(
                    in_features=self.layer_widths[i],
                    out_features=self.layer_widths[i + 1],
                )
            )
            layers.append(self.activation)

            if self.batch_norm:
                layers.append(nn.BatchNorm1d(num_features=self.layer_widths[i + 1]))

            if self.dropout > 0:
                layers.append(MonteCarloDropout(p=self.dropout))

        self.layers = nn.Sequential(*layers)

        self.backcast_linear_layer = nn.Linear(
            in_features=layer_width, out_features=n_theta_backcast
        )
        self.forecast_linear_layer = nn.Linear(
            in_features=layer_width, out_features=nr_params * n_theta_forecast
        )

    def forward(self, x):
        batch_size = x.shape[0]

        x = x.unsqueeze(1)
        x = self.pooling_layer(x)
        x = x.squeeze(1)

        x = self.layers(x)

        theta_backcast = self.backcast_linear_layer(x)
        theta_forecast = self.forecast_linear_layer(x)

        theta_forecast = theta_forecast.view(batch_size, self.nr_params, -1)

        theta_backcast = theta_backcast.unsqueeze(1)

        x_hat = F.interpolate(
            theta_backcast, size=self.input_chunk_length, mode="linear"
        )
        y_hat = F.interpolate(
            theta_forecast, size=self.output_chunk_length, mode="linear"
        )

        x_hat = x_hat.squeeze(1)

        y_hat = y_hat.reshape(x.shape[0], self.output_chunk_length, self.nr_params)

        return x_hat, y_hat


class _Block(nn.Module):
    def __init__(
        self,
        input_chunk_length: int,
        output_chunk_length: int,
        num_parts: int,
        num_layers: int,
        layer_width: int,
        nr_params: int,
        pooling_kernel_sizes: Tuple[int],
        n_freq_downsample: Tuple[int],
        batch_norm: bool,
        dropout: float,
        activation: str,
        MaxPool1d: bool,
    ):
        """
        Параметры
        ----------
        input_chunk_length - Длина входной последовательности, подаваемой на модель.
        output_chunk_length - Длина прогноза модели.
        nr_params - Количество точек при прогнозе.
        num_parts - Количество частей, составляющих каждый блок.
        num_layers - Количество полносвязных слоев в каждой части каждого блока.
        layer_widths - Определяет количество нейронов, составляющих каждый полносвязный слой в каждой части каждого блока.
        pooling_kernel_sizes - Размер ядер пуллинга для каждого стека и каждого блока.
        n_freq_downsample - Частота выборки.
        batch_norm - Применять ли нормализацию.
        dropout - Разреженная выборка.
        activation - Функция активации промежуточного слоя.
        MaxPool1d - Использовать пуллинг MaxPool1d. False использует AvgPool1d.
        **kwargs - все параметры базового класса PLPastCovariatesModule библиотеки Darts.

        Входные данные
        ------
        stack_input `(batch_size, input_chunk_length)` - Тензор, содержащий входную последовательность.

        Выходные данные
        -------
        stack_residual `(batch_size, input_chunk_length)` - Тензор, содержащий обратный прогноз блока.
        stack_forecast `(batch_size, output_chunk_length)` - Тензор, содержащий прямой прогноз стека.
        """
        super().__init__()

        self.input_chunk_length = input_chunk_length
        self.output_chunk_length = output_chunk_length
        self.nr_params = nr_params

        self.parts_list = [
            _Part(
                input_chunk_length,
                output_chunk_length,
                num_layers,
                layer_width,
                nr_params,
                pooling_kernel_sizes[i],
                n_freq_downsample[i],
                batch_norm=(
                    batch_norm and i == 0
                ), 
                dropout=dropout,
                activation=activation,
                MaxPool1d=MaxPool1d,
            )
            for i in range(num_parts)
        ]
        self.parts = nn.ModuleList(self.parts_list)

    def forward(self, x):

        stack_forecast = torch.zeros(
            x.shape[0],
            self.output_chunk_length,
            self.nr_params,
            device=x.device,
            dtype=x.dtype,
        )

        for part in self.parts_list:
        
            x_hat, y_hat = part(x)

            stack_forecast = stack_forecast + y_hat

            x = x - x_hat

        stack_residual = x

        return stack_residual, stack_forecast


class _ITSASModule(PLPastCovariatesModule):
    def __init__(
        self,
        input_dim: int,
        output_dim: int,
        nr_params: int,
        num_blocks: int,
        num_parts: int,
        num_layers: int,
        layer_widths: List[int],
        pooling_kernel_sizes: Tuple[Tuple[int]],
        n_freq_downsample: Tuple[Tuple[int]],
        batch_norm: bool,
        dropout: float,
        activation: str,
        MaxPool1d: bool,
        **kwargs,
    ):
        """
        Параметры
        ----------
        in_dim - Количество входных компонентов (основной ряд + необязательные ковариаты).
        out_dim - Количество выходных компонентов в основном ряде.
        nr_params - Количество точек при прогнозе.
        num_blocks - Количество блоков, составляющих всю модель.
        num_parts - Количество частей, составляющих каждый блок.
        num_layers - Количество полносвязных слоев в каждой части каждого блока.
        layer_widths - Определяет количество нейронов, составляющих каждый полносвязный слой в каждой части каждого блока.
        pooling_kernel_sizes - Размер ядер пуллинга для каждого стека и каждого блока.
        n_freq_downsample - Частота выборки.
        batch_norm - Применять ли нормализацию.
        dropout - Разреженная выборка.
        activation - Функция активации промежуточного слоя.
        MaxPool1d - Использовать пуллинг MaxPool1d. False использует AvgPool1d.
        **kwargs - все параметры базового класса PLPastCovariatesModule библиотеки Darts.

        Входы
        ------
        x_hat `(batch_size, input_chunk_length)` - тензор, содержащий входную последовательность.

        Выходы
        -------
        y_hat `(batch_size, output_chunk_length, target_size/out_dim, nr_params)` - Тензор, содержащий вывод.

        """
        super().__init__(**kwargs)

        self.input_dim = input_dim
        self.output_dim = output_dim
        self.nr_params = nr_params
        self.input_chunk_length_multi = self.input_chunk_length * input_dim

        self.output_chunk_length_multi = self.output_chunk_length * input_dim

        self.blocks_list = [
            _Block(
                self.input_chunk_length_multi,
                self.output_chunk_length_multi,
                num_parts,
                num_layers,
                layer_widths[i],
                nr_params,
                pooling_kernel_sizes[i],
                n_freq_downsample[i],
                batch_norm=(
                    batch_norm and i == 0
                ), 
                dropout=dropout,
                activation=activation,
                MaxPool1d=MaxPool1d,
            )
            for i in range(num_blocks)
        ]

        self.blocks = nn.ModuleList(self.blocks_list)

        self.blocks_list[-1].parts[-1].backcast_linear_layer.requires_grad_(False)

    @io_processor
    def forward(self, x_in: Tuple):
        x, _ = x_in

        x = torch.reshape(x, (x.shape[0], self.input_chunk_length_multi, 1))
        
        x = x.squeeze(dim=2)

        y = torch.zeros(
            x.shape[0],
            self.output_chunk_length_multi,
            self.nr_params,
            device=x.device,
            dtype=x.dtype,
        )

        for block in self.blocks_list:

            stack_residual, stack_forecast = block(x)

            y = y + stack_forecast

            x = stack_residual

        y = y.view(
            y.shape[0], self.output_chunk_length, self.input_dim, self.nr_params
        )[:, :, : self.output_dim, :]

        return y


class ITSASModel(PastCovariatesTorchModel):
    def __init__(
        self,
        input_chunk_length: int,
        output_chunk_length: int,
        num_blocks: int = 3,
        num_parts: int = 1,
        num_layers: int = 2,
        layer_widths: Union[int, List[int]] = 512,
        pooling_kernel_sizes: Optional[Tuple[Tuple[int]]] = None,
        n_freq_downsample: Optional[Tuple[Tuple[int]]] = None,
        dropout: float = 0.1,
        activation: str = "ReLU",
        MaxPool1d: bool = True,
        **kwargs,
    ):
        """
        Параметры
        ----------
        input_chunk_length - Длина входной последовательности, подаваемой на модель.
        output_chunk_length - Длина прогноза модели.
        nr_params - Количество точек при прогнозе.
        num_parts - Количество блоков, составляющих всю модель.
        num_parts - Количество частей, составляющих каждый блок.
        num_layers - Количество полносвязных слоев в каждой части каждого блока.
        layer_widths - Определяет количество нейронов, составляющих каждый полносвязный слой в каждой части каждого блока.
        pooling_kernel_sizes - Размер ядер пуллинга для каждого стека и каждого блока.
        n_freq_downsample - Частота выборки.
        batch_norm - Применять ли нормализацию.
        dropout - Разреженная выборка.
        activation - Функция активации промежуточного слоя.
        MaxPool1d - Использовать пуллинг MaxPool1d. False использует AvgPool1d.
        **kwargs - все параметры базового класса PLPastCovariatesModule библиотеки Darts.
        loss_fn - Функция потерь.
        likelihood - Вероятностное прогнозирование.
        batch_size
        n_epochs
        """
        super().__init__(**self._extract_torch_model_params(**self.model_params))

        self.pl_module_params = self._extract_pl_module_params(**self.model_params)

        raise_if_not(
            isinstance(layer_widths, int) or len(layer_widths) == num_blocks,
            "Пожалуйста, передайте целое число или список целых чисел с длиной `num_blocks`"
            "в качестве значения для аргумента `layer_widths`",
            logger,
        )

        self.num_blocks = num_blocks
        self.num_parts = num_parts
        self.num_layers = num_layers
        self.layer_widths = layer_widths
        self.activation = activation
        self.MaxPool1d = MaxPool1d

        self.batch_norm = False

        self.dropout = dropout

        sizes = self._prepare_pooling_downsampling(
            pooling_kernel_sizes,
            n_freq_downsample,
            self.input_chunk_length,
            self.output_chunk_length,
            num_parts,
            num_blocks,
        )
        self.pooling_kernel_sizes, self.n_freq_downsample = sizes

        if isinstance(layer_widths, int):
            self.layer_widths = [layer_widths] * self.num_blocks

    @property
    def supports_multivariate(self) -> bool:
        return True

    @staticmethod
    def _prepare_pooling_downsampling(
        pooling_kernel_sizes, n_freq_downsample, in_len, out_len, num_parts, num_blocks
    ):
        def _check_sizes(tup, name):
            raise_if_not(
                len(tup) == num_blocks,
                f"длина {name} должна соответствовать количеству стеков.",
            )
            raise_if_not(
                all([len(i) == num_parts for i in tup]),
                f"длина каждого кортежа в {name} должна быть num_parts = {num_parts}",
            )

        if pooling_kernel_sizes is None:
            max_v = max(in_len // 2, 1)
            pooling_kernel_sizes = tuple(
                (int(v),) * num_parts
                for v in max_v // np.geomspace(1, max_v, num_blocks)
            )
            logger.info(
                f"(ITSAS): Используется автоматический размер пуллинга ядра: {pooling_kernel_sizes}."
            )
        else:
            _check_sizes(pooling_kernel_sizes, "`pooling_kernel_sizes`")

        if n_freq_downsample is None:

            max_v = max(out_len // 2, 1)
            n_freq_downsample = tuple(
                (int(v),) * num_parts
                for v in max_v // np.geomspace(1, max_v, num_blocks)
            )
            logger.info(
                f"(ITSAS): Используются автоматические коэффициенты частоты выборки: {n_freq_downsample}."
            )
        else:

            _check_sizes(n_freq_downsample, "`n_freq_downsample`")

            raise_if_not(
                n_freq_downsample[-1][-1] == 1,
                "частота выборки для последней части последнего блока должна быть равна 1 "
                + "(т.е., `n_freq_downsample[-1][-1]`).",
            )

        return pooling_kernel_sizes, n_freq_downsample

    def _create_model(self, train_sample: Tuple[torch.Tensor]) -> torch.nn.Module:

        input_dim = train_sample[0].shape[1] + (
            train_sample[1].shape[1] if train_sample[1] is not None else 0
        )
        output_dim = train_sample[-1].shape[1]
        
        nr_params = 1 if self.likelihood is None else self.likelihood.num_parameters

        return _ITSASModule(
            input_dim = input_dim,
            output_dim = output_dim,
            nr_params = nr_params,
            num_blocks = self.num_blocks,
            num_parts = self.num_parts,
            num_layers = self.num_layers,
            layer_widths = self.layer_widths,
            pooling_kernel_sizes = self.pooling_kernel_sizes,
            n_freq_downsample = self.n_freq_downsample,
            batch_norm = self.batch_norm,
            dropout = self.dropout,
            activation = self.activation,
            MaxPool1d = self.MaxPool1d,
            **self.pl_module_params,
        )
