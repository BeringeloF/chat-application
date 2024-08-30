import { createGroup } from "./createGroup.js";
import { login } from "./login.js";
import { viewNotification } from "./markNotificationsAsVisualized.js";
import io from "socket.io-client";
import { search } from "./search.js";
import { addToContacts } from "./addToContacts.js";

class App {
  #socket = io();
  #usersContainer = document.querySelector(".user-list");
  #loginForm = document.getElementById("login-form");
  #main = document.querySelector(".main-content");
  #openCreateFormBtn = document.querySelector(".create-group-icon");
  #notificationCountEl = document.getElementById("notification-count");
  #searchBar = document.querySelector(".search-bar");
  #searchResults = document.querySelector(".search-results");
  #bellIcon = document.querySelector(".bell-icon");

  constructor() {
    if (!this.#loginForm) {
      this.#createPriviteRoomWithServer();
      this.#getNotifications();
    }

    this.#socket.on("chat", this.#renderMessage.bind(this));
    this.#socket.on("inviteToRoom", this.#acceptInvitation.bind(this));
    this.#socket.on("chatNotification", this.#renderChatNotification);
    this.#socket.on("serverNotification", (notification) => {
      this.#notificationCountEl.textContent =
        +this.#notificationCountEl.textContent + 1;
      this.#notificationCountEl.classList.add("show");
    });
    this.#usersContainer?.addEventListener(
      "click",
      this.#renderChat.bind(this)
    );
    this.#loginForm?.addEventListener("submit", this.#sendLoginForm.bind(this));
    this.#openCreateFormBtn?.addEventListener(
      "click",
      this.#openCreateGroupForm.bind(this)
    );

    this.#bellIcon &&
      this.#bellIcon.addEventListener(
        "click",
        this.#renderServerNotifications.bind(this)
      );
    if (this.#searchBar) {
      this.#searchBar.addEventListener("keydown", this.#doSearch.bind(this));
      this.#searchResults.addEventListener(
        "click",
        this.#tryToAddUser.bind(this)
      );
    }
  }

  async #createPriviteRoomWithServer() {
    const res = await fetch("/api/v1/users/getMe");
    const userId = await res.json();
    console.log(userId);

    if (!userId) return;

    this.#socket.emit("createRoomWithServer", userId.userId);
  }

  async #getNotifications() {
    const res = await fetch("/api/v1/users/notifications");
    const { data } = await res.json();
    console.log("notifications:", data);

    if (data.chatNotifications.length > 0)
      this.#renderChatNotification(data.chatNotifications);
    if (data.serverNotifications.length > 0) {
      this.#notificationCountEl.textContent = data.serverNotifications.length;
      this.#notificationCountEl.classList.add("show");
    }
  }

  async #sendMessage(e) {
    e.preventDefault();
    const messages = document.querySelector(".chat-box");
    const input = document.getElementById("input");
    const chatHeader = document.querySelector(".chat-header");

    if (input.value.trim()) {
      const room = chatHeader.getAttribute("data-room");
      try {
        await this.#socket.timeout(5000).emitWithAck("chat", input.value, room);
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
    const list = document.querySelector(".user-list");
    if (Array.isArray(notification)) {
      const markup = notification.map((el) => {
        const userItem = document.querySelector(
          `.user-item[data-room="${el.room}"]`
        );
        if (userItem) list.removeChild(userItem);

        return `
     <li class="user-item" data-room="${el.room}">
      <img class="user-avatar" src="/img/${
        el?.isFromGroup ? "group" : "users"
      }/${
          el?.isFromGroup ? el.groupData.image : el.triggeredBy.photo
        }" alt="User Avatar">
      <p class="user-name">${
        el?.isFromGroup
          ? el.groupData.name.split(" ")[0]
          : el.triggeredBy.name.split(" ")[0]
      }</p>
      <p class="message-count">${el.totalMessages}</p>
      <p class="user-message-preview">${el.preview}</p>
    </li>
    `;
      });
      list.insertAdjacentHTML("afterbegin", markup);
    } else {
      const markup = `
     <li class="user-item" data-room="${notification.room}">
      <img class="user-avatar" src="/img/${
        notification?.isFromGroup ? "group" : "users"
      }/${
        notification?.isFromGroup
          ? notification.groupData.image
          : notification.triggeredBy.photo
      }" alt="User Avatar">
      <p class="user-name">${
        notification?.isFromGroup
          ? notification.groupData.name.split(" ")[0]
          : notification.triggeredBy.name.split(" ")[0]
      }</p>
      <p class="message-count">${notification.totalMessages}</p>
      <p class="user-message-preview">${notification.preview}</p>
    </li>
    `;
      const userItem = document.querySelector(
        `.user-item[data-room="${notification.room}"]`
      );
      if (userItem) list.removeChild(userItem);
      list.insertAdjacentHTML("afterbegin", markup);
    }
  }

  #sendLoginForm(e) {
    e.preventDefault();
    const email = document.querySelector("#email").value;
    const password = document.querySelector("#password").value;
    console.log(email);
    login(email, password);
  }

  async #openCreateGroupForm() {
    this.#main.innerHTML = "";
    const createGroupFormMarkup = `
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

      <div class="contacts-container">
          <h3>Contatos</h3>
          <ul class="contact-list">
             
          </ul>
      </div>
    </div>
    `;
    try {
      const res = await fetch("/api/v1/users/getContacts");
      const { data } = await res.json();
      const contactsMarkup = data
        .map((el) => {
          return `
       <li data-user-id="${el.id}">
            <img class="user-avatar"src="/img/users/${el.image}">
            <span class="contact-name">${el.name.split(" ")[0]}</span>
            <button class="add-contact-btn">+</button>
       </li>`;
        })
        .join("");

      this.#main.insertAdjacentHTML("afterbegin", createGroupFormMarkup);
      const listContainer = document.querySelector(".contact-list");
      listContainer.innerHTML = contactsMarkup;
      listContainer.addEventListener("click", this.#addToGroup.bind(this));
      const createGroupForm = this.#main.querySelector(".create-group-form");
      createGroupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(createGroupForm);
        createGroup(formData, this.#socket);
        console.log("trying to create group...");
      });
    } catch (err) {
      console.error("💥", err);
    }
  }

  async #doSearch(e) {
    if (e.key !== "Enter") return;

    if (this.#searchBar.value.trim().length === 0) return;

    console.log(this.#searchBar.value.trim());

    const users = await search(this.#searchBar.value.trim());

    if (users.length === 0) {
      this.#searchResults.innerHTML = "No results found!";
      return;
    }

    this.#searchResults.innerHTML = "";
    const markup = users
      .map((user) => {
        const html = `<div class="user-item" data-user-id="${user._id}">
          <img src="/img/users/${user.photo}" class="user-avatar-2">
          <div class="user-name">${user.name}</div>
          <button class="add-contact-btn-2">+</button>
      </div>`;
        return html;
      })
      .join("");

    this.#searchResults.innerHTML = markup;
  }

  async #tryToAddUser(e) {
    if (!e.target.classList.contains("add-contact-btn-2")) return;
    const el = e.target.closest(".user-item");
    if (!el) return;
    const id = el.getAttribute("data-user-id");
    console.log(id);
    addToContacts(id);
  }

  async #renderServerNotifications() {
    this.#main.innerHTML = "";
    this.#notificationCountEl.classList.remove("show");
    const res = await fetch("/api/v1/users/notifications");
    const { data } = await res.json();
    const notificationsMarkup = data.serverNotifications
      .map((el) => {
        if (el.context === "invite to group") {
          console.log(el);
          return `<div class="notification-card">
    <div class="user-photo">
        <img src="/img/users/${el.triggeredBy.image}" alt="User Photo">
    </div>
    <div class="notification-content">
        <div class="user-info">
            <p class="user-name">${el.triggeredBy.name.split(" ")[0]}</p>
            <div class="invitation-container">
              <p>Do you want to accept ${
                el.triggeredBy.name.split(" ")[0]
              }'s invitation to join the group?</p>
              <div class="button-group">
                  <button class="accept-invitation" data-room="${
                    el.room
                  }" >Accept</button>
                  <button class="deny-invitation" data-room="${
                    el.room
                  }">Deny</button>
              </div>
        </div>
        </div>

    </div>
</div>`;
        }
      })
      .join("");
    const markup = `<div class="notification-container">${notificationsMarkup}</div>`;
    this.#main.innerHTML = markup;
    const notificationContainer = document.querySelector(
      ".notification-container"
    );
    notificationContainer.addEventListener("click", this.#agreedToJoin);
    notificationContainer.addEventListener("click", this.#refuseToJoin);
  }

  #addToGroup(e) {
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
  }

  async #agreedToJoin(e) {
    if (!e.target.classList.contains("accept-invitation")) return;
    const room = e.target.dataset.room;
    const resJ = await fetch(`/api/v1/users/joinToGroup/${room}`);
    const res = await resJ.json();
    console.log(res);
    console.log("accepting invitation...");
    await viewNotification(room, true);
  }

  async #refuseToJoin(e) {
    if (!e.target.classList.contains("deny-invitation")) return;
    const room = e.target.dataset.room;
    await viewNotification(room, true);
    location.assign("/");
  }

  async #renderChat(e) {
    const el = e.target.closest(".user-item");
    if (!el) return;

    const src = el.querySelector(".user-avatar").src;
    const name = el.querySelector(".user-name").textContent;
    const room = el.getAttribute("data-room");

    this.#main.innerHTML = "";

    await viewNotification(room);

    //el.querySelector(`.user-message-preview`).textContent = "";

    const chatHeaderMarkup = `
      <div class="chat-header" data-room="${room}">
        <img src="${src}" alt="User">
        <div class="name">${name}</div>
      </div>
    `;

    this.#main.insertAdjacentHTML("afterbegin", chatHeaderMarkup);

    const res = await this.#socket.timeout(5000).emitWithAck("join", room);

    if (res.status === "already joined") return;

    let chatBoxMarkup = `
      <div class="chat-box"></div>
    `;
    if (res.data) {
      chatBoxMarkup = `
      <div class="chat-box">${this.#generateTemplate(res.data, res.myId)}</div>
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

  #generateTemplate(messages, id) {
    return messages
      .map((msg) => {
        if (msg.sendBy === id) {
          return `
        <div class="message sent">
            <div class="text">
              ${msg.content}
            </div>
        </div>
      `;
        }
        return `
          <div class="message received">
              <div class="text">
                ${msg.content}
              </div>
          </div>
        `;
      })
      .join(``);
  }
}

const app = new App();
