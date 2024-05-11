from confluent_kafka import Producer
import json
from datetime import datetime
import sys
from ITSAS import ITSASModel
from darts import TimeSeries
from darts.dataprocessing.transformers import Scaler
import os

sys.stderr = open('error.txt', 'w')
sys.stdout = open('log.txt', 'w')

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

ulid = sys.argv[1]
projectID = sys.argv[2]
steps = int(sys.argv[3])

model = ITSASModel(
    input_chunk_length = 7,
    output_chunk_length = 7
)

print('Модель создана')

path = f"uploads\{ulid}\project-{projectID}"

if not os.path.exists(path):
    os.makedirs(path)

local_file_path = path + "\data.csv"

training_data = TimeSeries.from_csv(local_file_path, time_col='date')

print('Тренировочные данные загружены')

train_scaler = Scaler()

scaled_train = train_scaler.fit_transform(training_data)

model.fit(scaled_train, epochs = steps)

model.save(path + "\model.pkl")

message_content = f'Проект {projectID} обучился за {steps} эпох!'
print(message_content)
send_message(ulid, message_content)
