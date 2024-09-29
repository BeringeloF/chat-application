import { login, singup } from "./apiCalls/login.js";
import io from "socket.io-client";
import { search } from "./apiCalls/search.js";
import notificationManager from "./appManager/notificationsManager.js";
import groupManager from "./appManager/groupManager.js";
import chatManager from "./appManager/chatManager.js";
import { updateUserProfileImage } from "./apiCalls/updateUserProfileImage.js";
import { singInWithGoogle } from "./apiCalls/singInWithGoogle.js";
import process from "process/browser";
import { Buffer } from "buffer";
import axios from "axios";

// Tornar process e Buffer globais
window.process = process;
window.Buffer = Buffer;

class App {
  #socket = io();
  #usersContainer = document.querySelector(".user-list");
  #loginForm = document.getElementById("login-form");
  #singupForm = document.getElementById("signup-form");
  #openCreateFormBtn = document.querySelector(".create-group-icon");
  #searchBar = document.querySelector(".search-bar");
  #searchResults = document.querySelector(".search-results");
  #bellIcon = document.querySelector(".bell-icon");
  #myPhoto = document.querySelector(".my-photo");
  #main = document.querySelector(".main-content");
  #singInBtn = document.getElementById("google-signup");
  constructor() {
    if (!this.#loginForm && !this.#singupForm) {
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

    this.#myPhoto?.addEventListener(
      "click",
      this.#displayUpdateProfileImageForm.bind(this)
    );
  }

  async #createPriviteRoomWithServer() {
    const res = await fetch("/api/v1/users/getMe?onlyId=true");
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

  async #displayUpdateProfileImageForm(e) {
    const meJson = await fetch("/api/v1/users/getMe");
    const me = (await meJson.json()).user;

    const markup = `
    <div class="cyz-body">
    <div class="cyz-container">
  <div class="cyz-card">
      <div class="cyz-card-header">
          <h1 class="cyz-card-title">User Profile</h1>
      </div>
      <div class="cyz-card-content">
          <div class="cyz-profile-info">
              <div class="cyz-avatar">
                  <img id="avatar-image" src="/img/users/${me.photo}" alt="User Avatar">
                  <div id="avatar-fallback" class="cyz-avatar-fallback"></div>
              </div>
              <div class="cyz-user-details">
                  <h2 id="user-name">${me.name}</h2>
                  <p id="user-email">${me.email}</p>
              </div>
          </div>
          <form id="photo-form" class="cyz-photo-form">
              <div class="cyz-form-group">
                  <label for="photo">Change Profile Photo</label>
                  <input id="photo" type="file" accept="image/*" class="cyz-hidden">
                  <button type="button" id="select-photo-btn" class="cyz-btn">Select New Photo</button>
              </div>
              <button type="submit" id="update-photo-btn" class="cyz-btn cyz-hidden">Update Photo</button>
          </form>
      </div>
  </div>
</div>
</div>`;
    this.#main.innerHTML = "";
    this.#main.insertAdjacentHTML("afterbegin", markup);
    const avatarImage = document.getElementById("avatar-image");
    const photoInput = document.getElementById("photo");
    const selectPhotoBtn = document.getElementById("select-photo-btn");
    const updatePhotoBtn = document.getElementById("update-photo-btn");
    const photoForm = document.getElementById("photo-form");
    selectPhotoBtn.addEventListener("click", () => photoInput.click());
    photoInput.addEventListener(
      "change",
      this.#handlePhotoChange.bind(null, avatarImage, updatePhotoBtn)
    );
    photoForm.addEventListener(
      "submit",
      this.#updateProfileImage.bind(null, updatePhotoBtn)
    );
  }

  #updateProfileImage(updatePhotoBtn, e) {
    e.preventDefault();

    const formData = new FormData();
    const imageInput = document.getElementById("photo");
    if (imageInput.files.length > 0) {
      formData.append("photo", imageInput.files[0]);
    }

    updateUserProfileImage(formData);
    updatePhotoBtn.classList.add("cyz-hidden");
  }

  #handlePhotoChange(avatarImage, updatePhotoBtn, e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        avatarImage.src = reader.result;
        updatePhotoBtn.classList.remove("cyz-hidden");
      };
      reader.readAsDataURL(file);
    }
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
