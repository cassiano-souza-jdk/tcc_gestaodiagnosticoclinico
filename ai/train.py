import torch
import torch.nn as nn
import torch.optim as optim
from model import MedicationRecommender
import json
import os

# Mock mappings
CID_TO_IDX = {
    'CA23.0': 0, # Rinite alérgica
    'CA01.0': 1, # Sinusite aguda
    '8A81.0': 2, # Cefaleia do tipo tensional
    'QC00.0': 3  # Exame médico geral
}

IDX_TO_MED = {
    0: 'Loratadina 10 mg',
    1: 'Dipirona 500 mg',
    2: 'Amoxicilina 500 mg',
    3: 'Ibuprofeno 400 mg',
    4: 'Solução salina nasal 0,9%',
    5: 'Paracetamol 750 mg'
}

MED_TO_IDX = {v: k for k, v in IDX_TO_MED.items()}

def pretrain_model():
    model = MedicationRecommender(num_cids=len(CID_TO_IDX), num_medications=len(IDX_TO_MED))
    optimizer = optim.Adam(model.parameters(), lr=0.01)
    criterion = nn.CrossEntropyLoss()
    
    # Supervised learning simulated data: (CID_idx, Target_Medication_idx)
    # Ex: CA23.0 (Rinite) -> Loratadina (0) ou Solução Salina (4)
    # Ex: CA01.0 (Sinusite) -> Amoxicilina (2) ou Ibuprofeno (3)
    # Ex: 8A81.0 (Cefaleia) -> Dipirona (1) ou Paracetamol (5)
    training_data = [
        (0, 0), (0, 4), (0, 0), # Mostly Loratadina for Rinite
        (1, 2), (1, 3), (1, 2), # Amoxicilina and Ibuprofeno for Sinusite
        (2, 1), (2, 5), (2, 1), # Dipirona and Paracetamol for Cefaleia
        (3, 5)                  # Paracetamol as a generic option
    ]
    
    epochs = 100
    for epoch in range(epochs):
        total_loss = 0
        for cid, med in training_data:
            x = torch.tensor([cid], dtype=torch.long)
            y = torch.tensor([med], dtype=torch.long)
            
            optimizer.zero_grad()
            logits = model(x)
            loss = criterion(logits, y)
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            
        if (epoch+1) % 20 == 0:
            print(f"Epoch {epoch+1}/{epochs}, Loss: {total_loss/len(training_data):.4f}")
            
    # Save the model weights
    torch.save(model.state_dict(), 'model_weights.pth')
    print("Pre-training completed and model saved.")

def apply_reinforcement_feedback(model_path, cid_code, medication_name, feedback_score):
    """
    Applies reinforcement learning update based on patient feedback.
    feedback_score: 1 to 5. 
    Score 4-5 is positive reward. Score 1-2 is negative reward.
    """
    if not os.path.exists(model_path):
        pretrain_model()
        
    model = MedicationRecommender(num_cids=len(CID_TO_IDX), num_medications=len(IDX_TO_MED))
    model.load_state_dict(torch.load(model_path, weights_only=True))
    model.train()
    
    optimizer = optim.Adam(model.parameters(), lr=0.05) # Higher LR for immediate feedback adaptation
    
    cid_idx = CID_TO_IDX.get(cid_code)
    med_idx = MED_TO_IDX.get(medication_name)
    
    if cid_idx is None or med_idx is None:
        return
    
    x = torch.tensor([cid_idx], dtype=torch.long)
    logits = model(x)
    
    # Calculate a reward based on score
    # 5 -> +1.0, 4 -> +0.5, 3 -> 0.0, 2 -> -0.5, 1 -> -1.0
    reward = (feedback_score - 3.0) / 2.0
    
    # Policy Gradient style update
    log_probs = F.log_softmax(logits, dim=1)
    # We want to increase prob if reward > 0, decrease if reward < 0
    # Loss = -log_prob(action) * reward
    loss = -log_probs[0, med_idx] * reward
    
    optimizer.zero_grad()
    loss.backward()
    optimizer.step()
    
    torch.save(model.state_dict(), model_path)
    print(f"Feedback applied: CID={cid_code}, Med={medication_name}, Score={feedback_score}, Reward={reward}")

if __name__ == '__main__':
    pretrain_model()
