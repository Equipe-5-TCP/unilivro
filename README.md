# 📚 UniLivro — Troca de Livros Universitários

Aplicativo web para troca de livros entre estudantes universitários, permitindo cadastro, gerenciamento e compartilhamento de livros de forma simples e segura.

## Tecnologias
- **Backend:** Python + Flask
- **Banco de dados:** Firebase Firestore
- **Autenticação:** Firebase Authentication (JWT)
- **Frontend:** HTML, CSS e JavaScript
- **Integração:** Firebase SDK (client + admin)

## Funcionalidades

- Cadastro e login de usuários
- Autenticação segura com Firebase
- Cadastro de livros
- Listagem de livros do usuário
- Pausar / reativar disponibilidade
- Remoção de livros
- Associação de livros ao usuário (UID)

```

## Telas disponíveis

unilivro/
│
├── app.py                  # Backend Flask + rotas API
├── firebase_config.py      # Configuração Firebase Admin
├── requirements.txt
├── .gitignore
│
├── static/
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── auth.js         # Integração com Firebase Auth + API
│
├── templates/
│   ├── base.html
│   ├── login.html
│   ├── cadastro.html
│   ├── cadastrar_livro.html
│   └── meus_livros.html
```
