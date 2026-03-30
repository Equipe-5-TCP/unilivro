const firebaseConfig = {
  apiKey: "AIzaSyCV-F0BDO5RmXj3C40LqQYu7GyPz_BRX9Y",
  authDomain: "unilivro.firebaseapp.com",
  projectId: "unilivro"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();


//CONTROLE GLOBAL DE LOGIN
firebase.auth().onAuthStateChanged(user => {
  const publicPages = ["/login", "/cadastro"];
  const path = window.location.pathname;

  //Se não logado e não está em página pública: redireciona
  if (!user && !publicPages.includes(path)) {
    window.location.href = "/login";
    return;
  }

  //Mostrar nome no navbar
  if (user) {
    const nome = user.email.split("@")[0];

    const navUser = document.getElementById("nav-user");
    if (navUser) navUser.innerText = nome;

    const userInfo = document.getElementById("user-info");
    if (userInfo) userInfo.innerText = nome;
  }

  //Carregar livros SOMENTE na página correta
  if (user && path === "/meus-livros") {
    carregarLivros();
  }
});


//LOGIN
async function loginUser(form) {
  const btn = document.getElementById("btn-login");
  btn.innerText = "Entrando...";
  btn.disabled = true;

  const formData = Object.fromEntries(new FormData(form));

  try {
    const userCredential = await auth.signInWithEmailAndPassword(
      formData.email,
      formData.password
    );

    const token = await userCredential.user.getIdToken();
    localStorage.setItem("token", token);

    window.location.href = "/meus-livros";

  } catch (e) {
    alert("Erro ao login: " + e.message);
    btn.innerText = "Entrar";
    btn.disabled = false;
  }
}


//CADASTRO
async function registerUser(form) {
  const btn = document.getElementById("btn-register");
  btn.innerText = "Criando conta...";
  btn.disabled = true;

  const formData = Object.fromEntries(new FormData(form));

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(
      formData.email,
      formData.password
    );

    const user = userCredential.user;
    const token = await user.getIdToken();

    localStorage.setItem("token", token);

    await fetch("/api/usuarios", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token
      },
      body: JSON.stringify({
        name: formData.name,
        curso: formData.curso,
        email: formData.email
      })
    });

    window.location.href = "/meus-livros";

  } catch (e) {
    alert("Erro ao cadastrar: " + e.message);
    btn.innerText = "Criar minha conta";
    btn.disabled = false;
  }
}


//LISTAR LIVROS
async function carregarLivros() {
  const container = document.getElementById("books-container");
  const emptyState = document.getElementById("empty-state");

  const user = firebase.auth().currentUser;
  const token = await user.getIdToken();

  const res = await fetch("/api/livros", {
    headers: { Authorization: token }
  });

  const livros = await res.json();

  container.innerHTML = "";

  if (!livros.length) {
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  livros.forEach(book => {
    const card = `
      <div class="book-card ${!book.disponivel ? "paused" : ""}">
        <div class="book-content">
          <h3>${book.title}</h3>
          <p>${book.author}</p>
        </div>
      </div>
    `;
    container.innerHTML += card;
  });
}


//CRIAR LIVRO
async function criarLivro(data) {
  const token = localStorage.getItem("token");

  await fetch("/api/livros", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token
    },
    body: JSON.stringify(data)
  });

  window.location.href = "/meus-livros";
}


//DELETE
async function deletarLivro(id) {
  const token = localStorage.getItem("token");

  await fetch(`/api/livros/${id}`, {
    method: "DELETE",
    headers: { Authorization: token }
  });

  carregarLivros();
}


//TOGGLE
async function toggleLivro(id) {
  const token = localStorage.getItem("token");

  await fetch(`/api/livros/${id}/toggle`, {
    method: "PATCH",
    headers: { Authorization: token }
  });

  carregarLivros();
}


//LOGOUT
function logout() {
  auth.signOut();
  localStorage.removeItem("token");
  window.location.href = "/login";
}