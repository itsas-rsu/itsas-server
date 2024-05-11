import sys
import gdown
from ITSAS import ITSASModel
import pandas as pd
from darts import TimeSeries
from darts.dataprocessing.transformers import Scaler
import os
from confluent_kafka import Producer

# Файл для логирования
sys.stderr = open('log.txt', 'w')

ulid = sys.argv[2]

project = sys.argv[3]

steps = int(sys.argv[4])

path = f"uploads\{ulid}\{project}\model.pkl"

# Загрузка модели
model = ITSASModel.load(path)

# Ссылка на файл для дообучения на Google Диске
google_drive_url = sys.argv[1]

file_id = google_drive_url.split('/d/')[1].split('/view')[0]

download_url = f"https://drive.google.com/uc?id={file_id}"

print(download_url)

# Путь для сохранения файла данных
if not os.path.exists('uploads\%s\%s' %(ulid, project)):
    os.makedirs('uploads\%s\%s' %(ulid, project))

local_file_path = "uploads\%s\%s\data.csv" %(ulid, project)

print(local_file_path)

# Скачивание файла
gdown.download(download_url, local_file_path, quiet=False)

# Загрузка данных для дообучения
training_data = TimeSeries.from_csv(local_file_path, time_col='date')

train_scaler = Scaler()

scaled_train = train_scaler.fit_transform(training_data)

model.fit(scaled_train, epochs = steps)

model.save("uploads/%s/%s/model.pkl" %(ulid, project))

def delivery_report(err, msg):
    if err is not None:
        print(f"Сообщение не удалось доставить: {err}")
    else:
        print(f"Сообщение доставлено в {msg.topic()} [{msg.partition()}]")

conf = {
    'bootstrap.servers': 'cs.rsu.edu.ru:9092',  # Список брокеров
    'client.id': 'itsas-app'  # ID клиента
}

producer = Producer(**conf)

topic = 'testTopic'

try:
    message = 'Скрипт завершил работу!'
    producer.produce(topic, message.encode('utf-8'), callback=delivery_report)
except Exception as e:
    print(f"Возникла ошибка при отправке сообщения: {e}")

producer.flush()