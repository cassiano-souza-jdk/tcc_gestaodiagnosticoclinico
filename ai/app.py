from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import torch
import torch.nn.functional as F
import os
from model import MedicationRecommender
from train import CID_TO_IDX, IDX_TO_MED, apply_reinforcement_feedback, pretrain_model

app = FastAPI(title="TCC AI Microservice - Recommendation & Reinforcement")

MODEL_PATH = 'model_weights.pth'

class RecommendationRequest(BaseModel):
    cid_code: str
    paciente_historico: list[str] = [] # Optional history

class FeedbackRequest(BaseModel):
    cid_code: str
    medicamento_nome: str
    nota_eficacia: int # 1 to 5

def load_model():
    if not os.path.exists(MODEL_PATH):
        pretrain_model()
    model = MedicationRecommender(num_cids=len(CID_TO_IDX), num_medications=len(IDX_TO_MED))
    model.load_state_dict(torch.load(MODEL_PATH, weights_only=True))
    model.eval()
    return model

@app.post("/predict")
def predict_medication(req: RecommendationRequest):
    cid_idx = CID_TO_IDX.get(req.cid_code)
    if cid_idx is None:
        raise HTTPException(status_code=404, detail="CID_CODE not found in AI knowledge base.")
    
    model = load_model()
    x = torch.tensor([cid_idx], dtype=torch.long)
    
    with torch.no_grad():
        logits = model(x)
        probs = F.softmax(logits, dim=1).squeeze().numpy()
    
    # Get top 3 recommendations
    top_indices = probs.argsort()[-3:][::-1]
    
    recommendations = []
    for idx in top_indices:
        recommendations.append({
            "medicamento_nome": IDX_TO_MED[idx],
            "confianca_percentual": float(probs[idx] * 100)
        })
        
    return {"cid_code": req.cid_code, "recommendations": recommendations}

@app.post("/feedback")
def receive_feedback(req: FeedbackRequest):
    if req.nota_eficacia < 1 or req.nota_eficacia > 5:
        raise HTTPException(status_code=400, detail="Nota de eficácia deve ser entre 1 e 5.")
        
    apply_reinforcement_feedback(
        model_path=MODEL_PATH,
        cid_code=req.cid_code,
        medication_name=req.medicamento_nome,
        feedback_score=req.nota_eficacia
    )
    
    return {"message": "Feedback aplicado via Reinforcement Learning com sucesso."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
