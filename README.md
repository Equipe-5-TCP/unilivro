# 📚 BookSwap — Troca de Livros Universitários

Aplicativo web para troca de livros entre alunos de universidade.

## Tecnologias
- **Backend:** Python + Flask
- **Banco de dados:** SQLite (arquivo local `bookswap.db`)
- **Frontend:** HTML, CSS

## Como rodar

### 1. Instale as dependências
```bash
pip install flask
```

### 2. Inicie o servidor
```bash
python app.py
```

### 3. Acesse no navegador
```
http://localhost:5000
```

## Telas disponíveis

| Tela | Rota | Descrição |
|------|------|-----------|
| Login | `/login` | Autenticação por e-mail e senha |
| Cadastro | `/cadastro` | Registro de novo usuário universitário |
| Cadastrar Livro | `/cadastrar-livro` | Adicionar livro ao acervo pessoal |
| Meus Livros | `/meus-livros` | Ver, pausar e remover livros cadastrados |

## Estrutura do projeto
```
bookswap/
├── app.py              # Backend Flask + rotas + banco de dados
├── requirements.txt
├── bookswap.db         # Gerado automaticamente ao iniciar
├── static/
│   └── css/
│       └── style.css   # Estilos
└── templates/
    ├── base.html           # Layout base com navbar
    ├── login.html
    ├── cadastro.html
    ├── cadastrar_livro.html
    └── meus_livros.html
```
