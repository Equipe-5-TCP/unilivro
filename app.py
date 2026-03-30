from flask import Flask, render_template, request, jsonify
from firebase_config import db
from firebase_admin import auth
from functools import wraps

app = Flask(__name__)

def firebase_login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization")

        if not token:
            return jsonify({"error": "Token ausente"}), 401

        try:
            decoded = auth.verify_id_token(token)
            request.user = decoded
        except:
            return jsonify({"error": "Token inválido"}), 401

        return f(*args, **kwargs)
    return decorated

@app.route('/')
def index():
    return render_template('login.html')

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/cadastro')
def cadastro():
    return render_template('cadastro.html')

@app.route('/meus-livros')
def meus_livros():
    return render_template('meus_livros.html')

@app.route('/cadastrar-livro')
def cadastrar_livro():
    return render_template('cadastrar_livro.html')

@app.route('/api/livros', methods=['GET'])
@firebase_login_required
def listar_livros():
    uid = request.user['uid']

    docs = db.collection('books').where('user_id', '==', uid).stream()

    livros = []
    for doc in docs:
        data = doc.to_dict()
        data['id'] = doc.id
        livros.append(data)

    return jsonify(livros)

@app.route('/api/livros', methods=['POST'])
@firebase_login_required
def criar_livro():
    data = request.json
    uid = request.user['uid']

    db.collection('books').add({
        'user_id': uid,
        'title': data['title'],
        'author': data['author'],
        'isbn': data.get('isbn', ''),
        'categoria': data['categoria'],
        'condicao': data['condicao'],
        'descricao': data.get('descricao', ''),
        'disponivel': True
    })

    return {"message": "Livro criado"}

@app.route('/api/livros/<id>', methods=['DELETE'])
@firebase_login_required
def deletar_livro(id):
    db.collection('books').document(id).delete()
    return {"message": "Deletado"}

@app.route('/api/livros/<id>/toggle', methods=['PATCH'])
@firebase_login_required
def toggle_livro(id):
    ref = db.collection('books').document(id)
    doc = ref.get()

    if doc.exists:
        atual = doc.to_dict().get('disponivel', True)
        ref.update({'disponivel': not atual})

    return {"message": "Atualizado"}

@app.route('/api/usuarios', methods=['POST'])
@firebase_login_required
def criar_usuario():
    data = request.json
    uid = request.user['uid']

    db.collection('users').document(uid).set({
        'name': data['name'],
        'curso': data['curso'],
        'email': data['email']
    })

    return {"message": "Usuário criado"}


if __name__ == "__main__":
    app.run(debug=True)
