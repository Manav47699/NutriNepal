from ultralytics import YOLO
import sys, os
MODEL_PATH = "models/yolo/best.pt"
model = YOLO(MODEL_PATH)
print(model.names)
