FROM python:3.11-slim

WORKDIR /app

# Instala a versão levíssima do PyTorch (apenas CPU) ignorando bibliotecas NVIDIA
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Pretrain and then start the server
CMD ["python", "app.py"]
