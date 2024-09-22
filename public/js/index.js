import { login, singup } from "./api/login.js";
import io from "socket.io-client";
import { search } from "./api/search.js";
import notificationManager from "./appManager/notificationsManager.js";
import groupManager from "./appManager/groupManager.js";
import chatManager from "./appManager/chatManager.js";

class App {
  #socket = io();
  #usersContainer = document.querySelector(".user-list");
  #loginForm = document.getElementById("login-form");
  #singupForm = document.getElementById("signup-form");
  #openCreateFormBtn = document.querySelector(".create-group-icon");
  #searchBar = document.querySelector(".search-bar");
  #searchResults = document.querySelector(".search-results");
  #bellIcon = document.querySelector(".bell-icon");
  #leaveGroup = document.querySelector(".leave-group");
  #updateGroup = document.querySelector(".update-group");
  #showMoreInfo = document.querySelector(".show-info");
  constructor() {
    if (!this.#loginForm) {
      this.#createPriviteRoomWithServer();
      notificationManager.getNotifications();
    }

    this.#socket.on("chat", this.callDisplayRecivedMessage);
    this.#socket.on("inviteToRoom", this.#acceptInvitation.bind(this));
    this.#socket.on("chatNotification", this.callRenderChatNotification);
    this.#socket.on(
      "serverNotification",
      this.callUpdateServerNotificationsCount
    );
    this.#usersContainer?.addEventListener(
      "click",
      this.callDisplayChat.bind(null, this.#socket)
    );
    this.#usersContainer?.addEventListener(
      "click",
      this.callDisplayUpdateGroupForm.bind(null, this.#socket)
    );
    this.#loginForm?.addEventListener("submit", this.#sendLoginForm.bind(this));
    this.#singupForm?.addEventListener(
      "submit",
      this.#sendSingUpForm.bind(this)
    );

    this.#openCreateFormBtn?.addEventListener(
      "click",
      this.callDisplayCreateGroupForm.bind(null, this.#socket)
    );

    this.#usersContainer?.addEventListener(
      "click",
      this.callDisplayGroupInformation
    );

    this.#usersContainer?.addEventListener(
      "click",
      this.callDisplayLeaveGroupPopUp
    );

    this.#bellIcon &&
      this.#bellIcon.addEventListener(
        "click",
        this.callRenderServerNotification
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
    notificationManager.myId = userId.userId;
    chatManager.myId = userId.userId;
    groupManager.myId = userId.userId;
    this.#socket.emit("createRoomWithServer", userId.userId);
  }

  callRenderChatNotification(notification) {
    notificationManager.renderChatNotification(notification);
  }

  callRenderServerNotification(notification) {
    notificationManager.renderServerNotifications(notification);
  }

  callUpdateServerNotificationsCount(notification) {
    notificationManager.updateServerNotificationsCount(notification);
  }

  callDisplayCreateGroupForm(socket) {
    groupManager.displayCreateGroupForm(socket);
  }

  callDisplayUpdateGroupForm(socket, e) {
    groupManager.displayUpdateGroupForm(socket, e);
  }

  callDisplayGroupInformation(e) {
    groupManager.displayGroupInformation(e);
  }

  callDisplayLeaveGroupPopUp(e) {
    groupManager.displayLeaveGroupPopUp(e);
  }

  callDisplayChat(socket, e) {
    chatManager.displayChat(socket, e);
  }

  callDisplayRecivedMessage(msg, callback) {
    chatManager.displayRecivedMessage(msg, callback);
  }

  async #acceptInvitation(room) {
    this.#socket.emit("join", room);
    console.log("invite to room was emited");
  }

  #sendLoginForm(e) {
    e.preventDefault();
    const email = document.querySelector("#email").value;
    const password = document.querySelector("#password").value;
    console.log(email);
    login(email, password);
  }

  #sendSingUpForm(e) {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (!email || !password || !name || !confirmPassword) {
      showError("Please fill in all fields");
      return;
    }

    console.log(name, email, password, confirmPassword);

    singup(name, email, password, confirmPassword);
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

    this.#socket.emit("sendChatInvitation", id);
  }
}

const app = new App();
