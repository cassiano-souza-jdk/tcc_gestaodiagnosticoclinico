import torch
import torch.nn as nn
import torch.nn.functional as F

class MedicationRecommender(nn.Module):
    def __init__(self, num_cids, num_medications, embedding_dim=16):
        super(MedicationRecommender, self).__init__()
        # Embedding for diagnosis
        self.cid_embedding = nn.Embedding(num_cids, embedding_dim)
        
        # Neural Network layers
        self.fc1 = nn.Linear(embedding_dim, 32)
        self.dropout = nn.Dropout(0.2)
        self.fc2 = nn.Linear(32, num_medications)
        
    def forward(self, cid_idx):
        # Pass input through embedding
        x = self.cid_embedding(cid_idx)
        # Pass through hidden layer with ReLU
        x = F.relu(self.fc1(x))
        x = self.dropout(x)
        # Output logits for medications
        logits = self.fc2(x)
        return logits
