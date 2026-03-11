from app.services.embedding import generate_embedding

text = "def login_user(): print('hello')"
vector = generate_embedding(text)

print("Vector length:", len(vector))