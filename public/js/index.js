import { login } from "./login";
import io from "socket.io-client";

const socket = io();
const form = document.querySelector(".input-box");
const input = document.getElementById("input");
const messages = document.querySelector(".chat-box");
const usersContainer = document.querySelector(".user-list");
const loginForm = document.getElementById("login-form");
const chatHeader = document.querySelector(".chat-header");

(async () => {
  const res = await fetch("/api/v1/users/getMe");

  const userId = await res.json();

  console.log(userId);

  socket.emit("createRoomWithServer", userId.userId);

  const notifiRes = await socket
    .timeout(5000)
    .emitWithAck("getNotifications", userId.userId);

  if (notifiRes.notifications) {
    const list = document.querySelector(".user-list");
    const notifications = notifiRes.notifications;
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
})();

socket.on("chat", (msg, callback) => {
  const markup = `
        <div class="message received">
            <div class="text">
              ${msg}
            </div>
        </div>
      `;

  messages.insertAdjacentHTML("beforeend", markup);
  window.scrollTo(0, document.body.scrollHeight);
  callback({
    arrived: true,
  });
});

socket.on("inviteToRoom", async (room) => {
  socket.emit("join", room);
  console.log("invite to room was emited");
});

socket.on("notification", (notification, callback) => {
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
    `.user-item[data-user-id="${notification.triggeredBy}"]`
  );

  const list = document.querySelector(".user-list");

  if (userItem) list.removeChild(userItem);

  list.insertAdjacentHTML("afterbegin", markup);

  callback({ arrived: true });
});

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (input.value.trim()) {
    const targetUserId = chatHeader.getAttribute("data-user-id");

    const response = await socket
      .timeout(5000)
      .emitWithAck("chat", input.value, targetUserId);

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
});

usersContainer?.addEventListener("click", async (e) => {
  const el = e.target.closest(".user-item");
  if (!el) return;

  console.log(el.getAttribute("data-user-id"));
  const src = el.querySelector(".user-avatar").src;
  const name = el.querySelector(".user-name").textContent;

  chatHeader.innerHTML = `
  <img src="${src}" alt="User">
  <div class="name">${name}</div>
`;
  chatHeader.setAttribute("data-user-id", el.getAttribute("data-user-id"));

  const res = await socket
    .timeout(5000)
    .emitWithAck("chat with", el.getAttribute("data-user-id"));

  if (res.status === "alredy joined") return;

  if (res.data) {
    messages.insertAdjacentHTML("beforeend", res.data);
  }
});

loginForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.querySelector("#email").value;
  const password = document.querySelector("#password").value;
  console.log(email);
  login(email, password);
});
