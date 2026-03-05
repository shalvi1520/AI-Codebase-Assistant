from transformers import AutoTokenizer, AutoModel
import torch

# Load CodeBERT once (important)
tokenizer = AutoTokenizer.from_pretrained("microsoft/codebert-base")
model = AutoModel.from_pretrained("microsoft/codebert-base")

def generate_embedding(text):
    # Convert text to tokens
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=512
    )

    # Disable gradient calculation (faster inference)
    with torch.no_grad():
        outputs = model(**inputs)

    # Mean pooling (convert token embeddings to single vector)
    embedding = outputs.last_hidden_state.mean(dim=1)

    # Convert tensor to Python list
    return embedding.squeeze().tolist()