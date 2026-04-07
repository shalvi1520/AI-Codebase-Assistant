from transformers import AutoTokenizer, AutoModel
import torch


tokenizer = AutoTokenizer.from_pretrained("microsoft/codebert-base")
model = AutoModel.from_pretrained("microsoft/codebert-base")

def generate_embedding(text):
    
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=512
    )

    
    with torch.no_grad():
        outputs = model(**inputs)


    embedding = outputs.last_hidden_state.mean(dim=1)

    
    return embedding.squeeze().tolist()