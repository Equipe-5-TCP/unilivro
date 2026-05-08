from flask import Flask, send_from_directory, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from firebase_admin import auth
from firebase_config import initialize_firebase
from functools import wraps
import os

# ─── App & DB ─────────────────────────────────────────────────────────────────

app = Flask(__name__, static_folder='dist', static_url_path='')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///unilivro.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
initialize_firebase()

# ─── Models ───────────────────────────────────────────────────────────────────

class User(db.Model):
    __tablename__ = 'users'

    id      = db.Column(db.String(128), primary_key=True)   # UID do Firebase Auth
    name    = db.Column(db.String(255), nullable=False)
    email   = db.Column(db.String(255), nullable=False, unique=True)
    curso   = db.Column(db.String(255), nullable=False)

    books   = db.relationship('Book', backref='owner', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'email': self.email, 'curso': self.curso}


class Book(db.Model):
    __tablename__ = 'books'

    id         = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id    = db.Column(db.String(128), db.ForeignKey('users.id'), nullable=False)
    title      = db.Column(db.String(255), nullable=False)
    author     = db.Column(db.String(255), nullable=False)
    isbn       = db.Column(db.String(20),  nullable=True)
    categoria  = db.Column(db.String(100), nullable=True)
    condicao   = db.Column(db.String(20),  nullable=True)
    descricao  = db.Column(db.Text,        nullable=True)
    disponivel = db.Column(db.Boolean,     default=True)

    def to_dict(self):
        return {
            'id':         self.id,
            'user_id':    self.user_id,
            'title':      self.title,
            'author':     self.author,
            'isbn':       self.isbn,
            'categoria':  self.categoria,
            'condicao':   self.condicao,
            'descricao':  self.descricao,
            'disponivel': self.disponivel,
        }


# ─── Cria tabelas automaticamente na primeira execução ───────────────────────

with app.app_context():
    db.create_all()

# ─── Middleware de autenticação ───────────────────────────────────────────────

def firebase_login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization")

        if not token:
            return jsonify({"error": "Token ausente"}), 401

        try:
            decoded = auth.verify_id_token(token)
            request.user = decoded
        except Exception:
            return jsonify({"error": "Token inválido"}), 401

        return f(*args, **kwargs)
    return decorated

# ─── Servir o React ───────────────────────────────────────────────────────────

@app.route('/')
@app.route('/login')
@app.route('/cadastro')
@app.route('/meus-livros')
@app.route('/cadastrar-livro')
def serve_react():
    return send_from_directory(app.static_folder, 'index.html')

# ─── API: Usuários ────────────────────────────────────────────────────────────

@app.route('/api/usuarios', methods=['POST'])
@firebase_login_required
def criar_usuario():
    data = request.json
    uid  = request.user['uid']

    # Evita duplicar se o usuário já existe
    if User.query.get(uid):
        return jsonify({"message": "Usuário já existe"}), 200

    usuario = User(
        id    = uid,
        name  = data['name'],
        email = data['email'],
        curso = data['curso'],
    )
    db.session.add(usuario)
    db.session.commit()

    return jsonify({"message": "Usuário criado"}), 201

# ─── API: Livros ──────────────────────────────────────────────────────────────

@app.route('/api/livros', methods=['GET'])
@firebase_login_required
def listar_livros():
    uid   = request.user['uid']
    livros = Book.query.filter_by(user_id=uid).all()
    return jsonify([l.to_dict() for l in livros])


@app.route('/api/livros', methods=['POST'])
@firebase_login_required
def criar_livro():
    data = request.json
    uid  = request.user['uid']

    livro = Book(
        user_id    = uid,
        title      = data['title'],
        author     = data['author'],
        isbn       = data.get('isbn', ''),
        categoria  = data['categoria'],
        condicao   = data['condicao'],
        descricao  = data.get('descricao', ''),
        disponivel = True,
    )
    db.session.add(livro)
    db.session.commit()

    return jsonify({"message": "Livro criado"}), 201


@app.route('/api/livros/<int:id>', methods=['DELETE'])
@firebase_login_required
def deletar_livro(id):
    livro = Book.query.get_or_404(id)
    db.session.delete(livro)
    db.session.commit()
    return jsonify({"message": "Deletado"})


@app.route('/api/livros/<int:id>/toggle', methods=['PATCH'])
@firebase_login_required
def toggle_livro(id):
    livro = Book.query.get_or_404(id)
    livro.disponivel = not livro.disponivel
    db.session.commit()
    return jsonify({"message": "Atualizado"})

# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(debug=True)
