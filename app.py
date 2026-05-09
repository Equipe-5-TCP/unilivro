from flask import Flask, send_from_directory, request, jsonify
from firebase_admin import auth
from firebase_config import initialize_firebase
from functools import wraps
import psycopg2
import psycopg2.extras
import os

# ─── App ─────────────────────────────────────────────

app = Flask(__name__, static_folder='dist', static_url_path='')
initialize_firebase()

# ─── Conexão Supabase (PostgreSQL) ───────────────────

DATABASE_URL = os.getenv("DATABASE_URL")

def get_db_connection():
    return psycopg2.connect(DATABASE_URL)

# ─── Middleware Firebase ─────────────────────────────

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

# ─── React Routes ────────────────────────────────────

@app.route('/')
@app.route('/login')
@app.route('/cadastro')
@app.route('/meus-livros')
@app.route('/cadastrar-livro')
def serve_react():
    return send_from_directory(app.static_folder, 'index.html')

# ─── API Usuários ────────────────────────────────────

@app.route('/api/usuarios', methods=['POST'])
@firebase_login_required
def criar_usuario():
    data = request.json
    uid = request.user['uid']

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute(
        "SELECT id FROM users WHERE id = %s",
        (uid,)
    )

    usuario_existente = cur.fetchone()

    if usuario_existente:
        cur.close()
        conn.close()
        return jsonify({"message": "Usuário já existe"}), 200

    cur.execute("""
        INSERT INTO users (id, name, email, curso)
        VALUES (%s, %s, %s, %s)
    """, (
        uid,
        data['name'],
        data['email'],
        data['curso']
    ))

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"message": "Usuário criado"}), 201

# ─── API Livros ──────────────────────────────────────

@app.route('/api/livros', methods=['GET'])
@firebase_login_required
def listar_livros():
    uid = request.user['uid']

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute("""
        SELECT * FROM books
        WHERE user_id = %s
        ORDER BY id DESC
    """, (uid,))

    livros = cur.fetchall()

    cur.close()
    conn.close()

    return jsonify(livros)

@app.route('/api/livros', methods=['POST'])
@firebase_login_required
def criar_livro():
    data = request.json
    uid = request.user['uid']

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO books (
            user_id,
            title,
            author,
            isbn,
            categoria,
            condicao,
            descricao,
            disponivel
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        uid,
        data['title'],
        data['author'],
        data.get('isbn', ''),
        data['categoria'],
        data['condicao'],
        data.get('descricao', ''),
        True
    ))

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"message": "Livro criado"}), 201

@app.route('/api/livros/<int:id>', methods=['DELETE'])
@firebase_login_required
def deletar_livro(id):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        "DELETE FROM books WHERE id = %s",
        (id,)
    )

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"message": "Deletado"})

@app.route('/api/livros/<int:id>/toggle', methods=['PATCH'])
@firebase_login_required
def toggle_livro(id):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        UPDATE books
        SET disponivel = NOT disponivel
        WHERE id = %s
    """, (id,))

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"message": "Atualizado"})

# ─────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(debug=True)