import os
from dotenv import load_dotenv

# `.flaskenv` define FLASK_RUN_PORT para `flask run`; `.env` pode sobrescrever (ex.: DATABASE_URL).
load_dotenv(".flaskenv")
load_dotenv()

from flask import Flask, send_from_directory, request, jsonify
from firebase_admin import auth
from firebase_config import initialize_firebase
from functools import wraps
import psycopg2
import psycopg2.errors
import psycopg2.extras
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from urllib.parse import quote

# ─── App ─────────────────────────────────────────────

app = Flask(__name__, static_folder='dist', static_url_path='')
initialize_firebase()

# ─── Conexão Supabase (PostgreSQL) ───────────────────

DATABASE_URL = os.getenv("DATABASE_URL")

# ─── Config de E-mail (SMTP) ─────────────────────────
# Configure as variáveis de ambiente abaixo:
#   SMTP_HOST     → ex: smtp.gmail.com
#   SMTP_PORT     → ex: 587
#   SMTP_USER     → e-mail remetente (ex: unilivro@gmail.com)
#   SMTP_PASSWORD → senha de app (Gmail) ou senha SMTP

SMTP_HOST     = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT", 587))
SMTP_USER     = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")


def get_db_connection():
    return psycopg2.connect(DATABASE_URL)


def build_mailto_interesse(
    owner_email: str,
    owner_name: str,
    book_title: str,
    interested_name: str,
    interested_email: str,
) -> str:
    """Ligação mailto: para o interessado contactar o dono do livro pelo cliente de e-mail."""
    subject = f"UniLivro: interesse em «{book_title}»"
    body = (
        f"Olá, {owner_name},\n\n"
        f"Tenho interesse no seu livro «{book_title}» na UniLivro.\n\n"
        f"{interested_name}\n{interested_email}"
    )
    return f"mailto:{owner_email}?subject={quote(subject)}&body={quote(body)}"


def send_interest_email(owner_email: str, owner_name: str,
                        interested_email: str, interested_name: str,
                        book_title: str, book_author: str) -> bool:
    """Envia e-mail ao dono do livro informando o interesse de outro usuário.

    Retorna True se o SMTP enviou; False se não houver credenciais ou falhar o envio.
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        print(
            f"[EMAIL] Interesse em '{book_title}' de {interested_email} para {owner_email} "
            "(SMTP_USER / SMTP_PASSWORD não definidos — nenhum e-mail enviado)",
            flush=True,
        )
        return False

    subject = f"📚 Alguém tem interesse no seu livro \"{book_title}\""

    html_body = f"""
    <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0D0D0D;">
      <div style="background:#0D0D0D; padding: 20px 28px; border-bottom: 3px solid #B82828;">
        <span style="font-size: 1.4rem; font-weight: 700; color: #fff;">
          Uni<em style="color:#D94040; font-style:italic;">Livro</em>
        </span>
      </div>
      <div style="padding: 32px 28px; background: #F8F5F0; border: 1px solid #E0D9D0; border-top: none;">
        <p style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase;
                  letter-spacing: 0.1em; color: #B82828; margin-bottom: 8px;">
          Nova notificação
        </p>
        <h1 style="font-size: 1.6rem; font-weight: 700; margin: 0 0 16px; line-height: 1.2;">
          Interesse no seu livro!
        </h1>
        <p style="font-size: 0.95rem; color: #5A5248; margin-bottom: 24px;">
          Olá, <strong>{owner_name}</strong>!<br><br>
          O usuário <strong>{interested_name}</strong> demonstrou interesse em um dos seus livros na UniLivro.
        </p>
        <div style="background: #fff; border: 1px solid #E0D9D0; border-radius: 10px;
                    padding: 18px 20px; margin-bottom: 24px;">
          <p style="margin: 0 0 6px; font-size: 0.7rem; font-weight: 700;
                    text-transform: uppercase; letter-spacing: 0.1em; color: #9A9080;">
            Livro de interesse
          </p>
          <p style="margin: 0; font-size: 1.1rem; font-weight: 700; color: #0D0D0D;">
            {book_title}
          </p>
          <p style="margin: 4px 0 0; font-size: 0.875rem; color: #5A5248;">{book_author}</p>
        </div>
        <div style="background: #EAF3ED; border: 1px solid #c3dece; border-radius: 10px;
                    padding: 14px 20px; margin-bottom: 28px;">
          <p style="margin: 0 0 4px; font-size: 0.7rem; font-weight: 700;
                    text-transform: uppercase; letter-spacing: 0.1em; color: #2E6B4F;">
            Contato do interessado
          </p>
          <p style="margin: 0; font-size: 1rem; font-weight: 600; color: #0D0D0D;">
            {interested_name}
          </p>
          <a href="mailto:{interested_email}"
             style="font-size: 0.9rem; color: #2E6B4F; text-decoration: none; font-weight: 500;">
            {interested_email}
          </a>
        </div>
        <p style="font-size: 0.875rem; color: #9A9080;">
          Entre em contato diretamente com o usuário para combinar a troca. Boas trocas! 📖
        </p>
      </div>
      <div style="padding: 16px 28px; text-align: center; font-size: 0.75rem; color: #9A9080;">
        UniLivro · Plataforma de Troca de Livros Universitários
      </div>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = SMTP_USER
    msg["To"]      = owner_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, owner_email, msg.as_string())
        print(f"[EMAIL] Enviado para {owner_email} (livro: {book_title})", flush=True)
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Falha SMTP ao enviar para {owner_email}: {e}", flush=True)
        return False


# ─── Middleware Firebase ─────────────────────────────

def firebase_login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = (request.headers.get("Authorization") or "").strip()
        if token.lower().startswith("bearer "):
            token = token[7:].strip()

        if not token:
            return jsonify({"error": "Token ausente"}), 401

        try:
            decoded = auth.verify_id_token(token)
            request.user = decoded
        except Exception as e:
            # Ajuda a diagnosticar chave/projeto errado; veja também o terminal do Flask.
            print(f"[auth] verify_id_token falhou: {type(e).__name__}: {e}", flush=True)
            payload = {"error": "Token inválido"}
            if app.debug:
                payload["detail"] = f"{type(e).__name__}: {e}"
            return jsonify(payload), 401

        return f(*args, **kwargs)

    return decorated

# ─── React Routes ────────────────────────────────────

@app.route('/')
@app.route('/login')
@app.route('/cadastro')
@app.route('/meus-livros')
@app.route('/cadastrar-livro')
@app.route('/explorar')
@app.route('/interesses-recebidos')
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

    cur.execute("SELECT id FROM users WHERE id = %s", (uid,))
    usuario_existente = cur.fetchone()

    if usuario_existente:
        cur.close()
        conn.close()
        return jsonify({"message": "Usuário já existe"}), 200

    cur.execute("""
        INSERT INTO users (id, name, email, curso)
        VALUES (%s, %s, %s, %s)
    """, (uid, data['name'], data['email'], data['curso']))

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"message": "Usuário criado"}), 201

# ─── API Livros ──────────────────────────────────────

@app.route('/api/livros', methods=['GET'])
@firebase_login_required
def listar_livros():
    """Retorna apenas os livros do próprio usuário autenticado."""
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


@app.route('/api/livros/disponiveis', methods=['GET'])
@firebase_login_required
def listar_livros_disponiveis():
    """
    Retorna todos os livros disponíveis de OUTROS usuários.
    Suporte a filtros opcionais via query string:
      ?categoria=Ficção Científica
      ?condicao=Novo
      ?busca=nome do livro ou autor
    """
    uid = request.user['uid']

    categoria = request.args.get('categoria', '').strip()
    condicao  = request.args.get('condicao', '').strip()
    busca     = request.args.get('busca', '').strip()

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    query = """
        SELECT
            b.id,
            b.title,
            b.author,
            b.isbn,
            b.categoria,
            b.condicao,
            b.descricao,
            b.disponivel,
            u.name  AS owner_name,
            u.curso AS owner_curso
        FROM books b
        JOIN users u ON u.id = b.user_id
        WHERE b.disponivel = TRUE
          AND b.user_id != %s
    """
    params = [uid]

    if categoria:
        query += " AND b.categoria = %s"
        params.append(categoria)

    if condicao:
        query += " AND b.condicao = %s"
        params.append(condicao)

    if busca:
        query += " AND (b.title ILIKE %s OR b.author ILIKE %s)"
        params.extend([f"%{busca}%", f"%{busca}%"])

    query += " ORDER BY b.id DESC"

    cur.execute(query, params)
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
            user_id, title, author, isbn,
            categoria, condicao, descricao, disponivel
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
        True,
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
    cur.execute("DELETE FROM books WHERE id = %s", (id,))
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


@app.route('/api/interesses-recebidos', methods=['GET'])
@firebase_login_required
def listar_interesses_recebidos():
    """Interesses nos livros do utilizador autenticado (dono)."""
    uid = request.user['uid']
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cur.execute("""
            SELECT
                bi.id AS interest_id,
                bi.created_at,
                bi.book_id,
                b.title AS book_title,
                b.author AS book_author,
                u.name AS interested_name,
                u.email AS interested_email
            FROM book_interests bi
            INNER JOIN books b ON b.id = bi.book_id AND b.user_id = %s
            INNER JOIN users u ON u.id = bi.interested_user_id
            ORDER BY bi.created_at DESC
        """, (uid,))
        rows = cur.fetchall()
    except psycopg2.errors.UndefinedTable:
        cur.close()
        conn.close()
        return jsonify({
            "error": (
                "Tabela book_interests não existe. Execute db/migrations/001_book_interests.sql no Supabase (SQL Editor)."
            ),
        }), 503
    cur.close()
    conn.close()
    out = []
    for r in rows:
        item = dict(r)
        ts = item.get("created_at")
        if ts is not None:
            item["created_at"] = ts.isoformat()
        out.append(item)
    return jsonify(out)


@app.route('/api/livros-interesse/<int:id>', methods=['POST'])
@firebase_login_required
def demonstrar_interesse(id):
    """
    Regista o interesse na tabela book_interests e tenta enviar e-mail ao dono (SMTP opcional).

    Regras:
    - Não é possível demonstrar interesse no próprio livro.
    - Livro indisponível: 409.
    - Interesse repetido no mesmo livro: 409 (resposta inclui mailto para contactar o dono).
    """
    uid_interessado = request.user['uid']

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute("""
        SELECT
            b.id,
            b.title,
            b.author,
            b.disponivel,
            b.user_id  AS owner_id,
            u.name     AS owner_name,
            u.email    AS owner_email
        FROM books b
        JOIN users u ON u.id = b.user_id
        WHERE b.id = %s
    """, (id,))

    livro = cur.fetchone()

    if not livro:
        cur.close()
        conn.close()
        return jsonify({"error": "Livro não encontrado"}), 404

    if livro['owner_id'] == uid_interessado:
        cur.close()
        conn.close()
        return jsonify({"error": "Você não pode demonstrar interesse no seu próprio livro"}), 400

    if not livro['disponivel']:
        cur.close()
        conn.close()
        return jsonify({"error": "Este livro não está disponível"}), 409

    cur.execute("SELECT name, email FROM users WHERE id = %s", (uid_interessado,))
    interessado = cur.fetchone()

    if not interessado:
        cur.close()
        conn.close()
        return jsonify({"error": "Usuário interessado não encontrado"}), 404

    mailto_owner = build_mailto_interesse(
        livro['owner_email'],
        livro['owner_name'],
        livro['title'],
        interessado['name'],
        interessado['email'],
    )

    try:
        cur.execute(
            """
            INSERT INTO book_interests (book_id, interested_user_id)
            VALUES (%s, %s)
            ON CONFLICT (book_id, interested_user_id) DO NOTHING
            RETURNING id, created_at
            """,
            (id, uid_interessado),
        )
        row = cur.fetchone()
        conn.commit()
    except psycopg2.errors.UndefinedTable:
        conn.rollback()
        cur.close()
        conn.close()
        return jsonify({
            "error": (
                "Tabela book_interests não existe. No Supabase, abra SQL Editor e execute o arquivo "
                "db/migrations/001_book_interests.sql deste projeto."
            ),
        }), 503
    cur.close()
    conn.close()

    if not row:
        return jsonify({
            "error": "Você já demonstrou interesse neste livro.",
            "already_interested": True,
            "owner_email": livro['owner_email'],
            "owner_name": livro['owner_name'],
            "mailto_owner": mailto_owner,
        }), 409

    email_sent = send_interest_email(
        owner_email      = livro['owner_email'],
        owner_name       = livro['owner_name'],
        interested_email = interessado['email'],
        interested_name  = interessado['name'],
        book_title       = livro['title'],
        book_author      = livro['author'],
    )

    created = row["created_at"]
    created_iso = created.isoformat() if created else None

    return jsonify({
        "message": (
            "E-mail enviado ao dono do livro."
            if email_sent
            else "Interesse guardado. O e-mail automático não foi enviado (configure SMTP no servidor). Use o botão para escrever ao dono."
        ),
        "owner_email": livro['owner_email'],
        "owner_name": livro['owner_name'],
        "mailto_owner": mailto_owner,
        "email_sent": email_sent,
        "interest_id": row["id"],
        "created_at": created_iso,
    }), 200

# ─────────────────────────────────────────────────────

if __name__ == "__main__":
    # Mesma prioridade que `flask run`: FLASK_RUN_PORT, depois FLASK_PORT, depois 5050.
    port = int(os.getenv("FLASK_RUN_PORT") or os.getenv("FLASK_PORT") or "5050")
    app.run(debug=False, port=port)
