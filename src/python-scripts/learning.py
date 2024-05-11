import datetime
import json
import sys
from ITSAS import ITSASModel
from darts import TimeSeries
from darts.dataprocessing.transformers import Scaler
import os
from confluent_kafka import Producer

# Файл для логирования
sys.stderr = open('log.txt', 'w')

ulid = sys.argv[2]

project = sys.argv[3]

steps = int(sys.argv[4])

path = f"uploads\{ulid}\{project}"

# Определение модели
model = ITSASModel()

# Путь для сохранения файла данных
if not os.path.exists(path):
    os.makedirs(path)

local_file_path = path + "\data.csv"

print(local_file_path)

# Загрузка данных для обучения
training_data = TimeSeries.from_csv(local_file_path, time_col='date')

train_scaler = Scaler()

scaled_train = train_scaler.fit_transform(training_data)

model.fit(scaled_train, epochs = steps)

model.save(path + "\model.pkl")

def acked(err, msg):
    if err is not None:
        print(f"Failed to deliver message: {err}")
    else:
        print(f"Message produced: {msg.topic()} {msg.partition()} {msg.offset()}")

def send_message(ulid, message_content):

    conf = {
        'bootstrap.servers': 'cs.rsu.edu.ru:9092',  # Список брокеров
        'client.id': 'itsas-app'  # ID клиента
    }

    producer = Producer(**conf)
    message = {
        'ulid': ulid,
        'messageContent': message_content,
        'timestamp': int(datetime.now().timestamp() * 1000),
        'isRead': False
    }

    producer.produce('notification', json.dumps(message).encode('utf-8'), callback=acked)
    producer.flush()

message_content = f'Проект {project} обучился за {steps} эпох!'
send_message(ulid, message_content)