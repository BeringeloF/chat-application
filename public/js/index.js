import { createGroup } from "./createGroup.js";
import { login } from "./login.js";
import { viewNotification } from "./markNotificationsAsVisualized.js";
import io from "socket.io-client";

class App {
  #socket = io();
  #usersContainer = document.querySelector(".user-list");
  #loginForm = document.getElementById("login-form");
  #main = document.querySelector(".main-content");
  #openCreateFormBtn = document.querySelector(".create-group-icon");
  #notificationCountEl = document.getElementById("notification-count");

  constructor() {
    this.#createPriviteConnectionWithServer();
    this.#getNotifications();
    this.#socket.on("chat", this.#renderMessage.bind(this));
    this.#socket.on("inviteToRoom", this.#acceptInvitation.bind(this));
    this.#socket.on("chatNotification", this.#renderChatNotification);
    this.#usersContainer?.addEventListener(
      "click",
      this.#renderChat.bind(this)
    );
    this.#loginForm?.addEventListener("submit", this.#sendLoginForm.bind(this));
    this.#openCreateFormBtn?.addEventListener(
      "click",
      this.#openCreateGroupForm.bind(this)
    );
  }

  async #createPriviteConnectionWithServer() {
    const res = await fetch("/api/v1/users/getMe");
    const userId = await res.json();
    console.log(userId);

    if (!userId) return;

    this.#socket.emit("createRoomWithServer", userId.userId);
  }

  async #getNotifications() {
    const notifiRes = await fetch("/api/v1/users/notifications");
    const { data } = await notifiRes.json();
    console.log("notifications:", data);

    if (data.chatNotifications.length > 0)
      this.#renderChatNotifications(data.chatNotifications);
    if (data.serverNotifications.length > 0)
      this.#notificationCountEl.textContent = data.serverNotifications.length;
  }

  async #sendMessage(e) {
    e.preventDefault();
    const messages = document.querySelector(".chat-box");
    const input = document.getElementById("input");
    const chatHeader = document.querySelector(".chat-header");

    if (input.value.trim()) {
      const targetUserId = chatHeader.getAttribute("data-user-id");
      try {
        await this.#socket
          .timeout(5000)
          .emitWithAck("chat", input.value, targetUserId);
      } catch (err) {
        console.error("error mine", err);
      }

      const markup = `
        <div class="message sent">
            <div class="text">
              ${input.value}
            </div>
        </div>
      `;
      messages.insertAdjacentHTML("beforeend", markup);
      input.value = "";
    }
    console.log("enviando");
  }

  #renderMessage(msg, callback) {
    callback({ arrived: true });
    const messages = document.querySelector(".chat-box");
    const markup = `
      <div class="message received">
          <div class="text">
            ${msg}
          </div>
      </div>
    `;
    messages.insertAdjacentHTML("beforeend", markup);
    window.scrollTo(0, document.body.scrollHeight);
  }

  async #acceptInvitation(room) {
    this.#socket.emit("join", room);
    console.log("invite to room was emited");
  }

  #renderChatNotification(notification) {
    const markup = `
     <li class="user-item" data-user-id="${notification.triggeredBy._id}">
      <img class="user-avatar" src="/img/users/${
        notification.triggeredBy.photo
      }" alt="User Avatar">
      <p class="user-name">${notification.triggeredBy.name.split(" ")[0]}</p>
      <p class="message-count">${notification.totalMessages}</p>
      <p class="user-message-preview">${notification.preview}</p>
    </li>
    `;
    const userItem = document.querySelector(
      `.user-item[data-user-id="${notification.triggeredBy._id}"]`
    );
    const list = document.querySelector(".user-list");

    if (userItem) list.removeChild(userItem);

    list.insertAdjacentHTML("afterbegin", markup);
  }

  async #renderChat(e) {
    const el = e.target.closest(".user-item");
    if (!el) return;

    console.log(el.getAttribute("data-user-id"));

    const src = el.querySelector(".user-avatar").src;
    const name = el.querySelector(".user-name").textContent;
    const targetUserId = el.getAttribute("data-user-id");

    this.#main.innerHTML = "";

    await viewNotification(targetUserId);

    el.querySelector(`.user-message-preview`).textContent = "";

    const chatHeaderMarkup = `
      <div class="chat-header" data-user-id="${targetUserId}">
        <img src="${src}" alt="User">
        <div class="name">${name}</div>
      </div>
    `;

    this.#main.insertAdjacentHTML("afterbegin", chatHeaderMarkup);

    const res = await this.#socket
      .timeout(5000)
      .emitWithAck("chat with", targetUserId);

    if (res.status === "already joined") return;

    let chatBoxMarkup = `
      <div class="chat-box"></div>
    `;
    if (res.data) {
      chatBoxMarkup = `
      <div class="chat-box">${res.data}</div>
      `;
    }

    this.#main.insertAdjacentHTML("beforeend", chatBoxMarkup);
    const formMarkup = `
    <form class="input-box">
      <input type="text" placeholder="Type a message" id="input">
      <button type="submit">Send</button>
    </form>
   `;

    this.#main.insertAdjacentHTML("beforeend", formMarkup);
    const form = this.#main.querySelector(".input-box");
    form.addEventListener("submit", this.#sendMessage.bind(this));
  }

  #sendLoginForm(e) {
    e.preventDefault();
    const email = document.querySelector("#email").value;
    const password = document.querySelector("#password").value;
    console.log(email);
    login(email, password);
  }

  #openCreateGroupForm() {
    this.#main.innerHTML = "";
    const createUserFormMarkup = `
    <div class="div"> 
    <div class="form-container">
          <h2>Criar Novo Grupo</h2>
          <form class='create-group-form' enctype="multipart/form-data">
              <div class="form-group">
                  <label for="group-name">Nome do Grupo:</label>
                  <input type="text" id="group-name" name="name" placeholder="Digite o nome do grupo" required>
              </div>
              <div class="form-group">
                  <label for="group-description">Descrição do Grupo:</label>
                  <textarea id="group-description" name="description" placeholder="Digite uma descrição para o grupo" required></textarea>
              </div>
              <div class="form-group">
                  <label for="group-image">Imagem do Grupo:</label>
                  <input type="file" id="group-image" name="image" accept="image/*" required>
              </div>
             <input type="hidden" name="participants" id="hidden-input" value="">
              <div class="form-group">
                  <button type="submit">Criar Grupo</button>
              </div>
          </form>
      </div>

      <!-- Lista de contatos -->
      <div class="contacts-container">
          <h3>Contatos</h3>
          <ul class="contact-list">
              <li data-user-id="">
                  <span class="contact-name">Contato 1</span>
                  <button class="add-contact-btn">+</button>
              </li>
              <li data-user-id="">
                  <span class="contact-name">Contato 2</span>
                  <button class="add-contact-btn">+</button>
              </li>
             <li data-user-id="">
                  <span class="contact-name">Contato 3</span>
                  <button class="add-contact-btn">+</button>
             </li>
          </ul>
      </div>
    </div>
    `;
    this.#main.insertAdjacentHTML("afterbegin", createUserFormMarkup);
    const listContainer = document.querySelector(".contact-list");
    listContainer.addEventListener("click", (e) => {
      if (!e.target.classList.contains("add-contact-btn")) return;
      const btn = e.target;
      if (!btn.classList.contains("clicked")) {
        btn.classList.add("clicked");
        const id = btn.closest("li").getAttribute("data-user-id");
        btn.textContent = "Added";

        const participants = this.#main.querySelector("#hidden-input");
        participants.value += ` ${id}`;
      } else {
        const participants = this.#main.querySelector("#hidden-input");
        const participantsArray = participants.value.trim().split(" ");
        const id = btn.closest("li").getAttribute("data-user-id");
        const index = participantsArray.findIndex((el) => el === id);
        participantsArray.splice(index, 1);
        participants.value = participantsArray.join(" ");
        btn.classList.remove("clicked");
        btn.textContent = "+";
      }
    });
    const createGroupForm = this.#main.querySelector(".create-group-form");
    createGroupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(createGroupForm);
      createGroup(formData);
    });
  }

  #renderChatNotifications(notifications) {
    const list = document.querySelector(".user-list");
    const markup = notifications
      .map((el) => {
        const userItem = document.querySelector(
          `.user-item[data-user-id="${el.triggeredBy._id}"]`
        );
        if (userItem) list.removeChild(userItem);

        return `
      <li class="user-item" data-user-id="${el.triggeredBy._id}">
        <img class="user-avatar" src="/img/users/${
          el.triggeredBy.photo
        }" alt="User Avatar">
        <p class="user-name">${el.triggeredBy.name.split(" ")[0]}</p>
        <p class="message-count">${el.totalMessages}</p>
        <p class="user-message-preview">${el.preview}</p>
      </li>
    `;
      })
      .join("");

    list.insertAdjacentHTML("afterbegin", markup);
  }
}

const app = new App();
