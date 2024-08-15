import { login } from "./login.js";
import { viewNotification } from "./markNotificationsAsVisualized.js";
import io from "socket.io-client";

const socket = io();
const messages = document.querySelector(".chat-box");
const usersContainer = document.querySelector(".user-list");
const loginForm = document.getElementById("login-form");
const chatHeader = document.querySelector(".chat-header");
const main = document.querySelector('.main-content')


async function sendMessage(e) {
  e.preventDefault();
  const input = document.getElementById("input");
  if (input.value.trim()) {
    const targetUserId = chatHeader.getAttribute("data-user-id");
    try {
      const response = await socket
        .timeout(5000)
        .emitWithAck("chat", input.value, targetUserId);
    } catch(err) {
      console.error('error mine',err)
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

(async () => {
  const res = await fetch("/api/v1/users/getMe");

  const userId = await res.json();

  console.log(userId);

  if (!userId) return;

  socket.emit("createRoomWithServer", userId.userId);

  const notifiRes = await fetch("/api/v1/users/notifications");

  const { data } = await notifiRes.json();

  console.log("notifications:", data);

  if (data.notifications) {
    const list = document.querySelector(".user-list");
    const notifications = data.notifications;
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
  callback({
    arrived: true,
  });
  const markup = `
        <div class="message received">
            <div class="text">
              ${msg}
            </div>
        </div>
      `;

  messages.insertAdjacentHTML("beforeend", markup);
  window.scrollTo(0, document.body.scrollHeight);
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
    `.user-item[data-user-id="${notification.triggeredBy._id}"]`
  );

  const list = document.querySelector(".user-list");

  if (userItem) list.removeChild(userItem);

  list.insertAdjacentHTML("afterbegin", markup);

  callback({ arrived: true });
});



usersContainer?.addEventListener("click", async (e) => {
  const el = e.target.closest(".user-item");
  if (!el) return;

  console.log(el.getAttribute("data-user-id"));

  const src = el.querySelector(".user-avatar").src;
  const name = el.querySelector(".user-name").textContent;
  const targetUserId = el.getAttribute("data-user-id");

  await viewNotification(targetUserId)

  document.querySelector(`.user-message-preview[data-user-id="${targetUserId}"]`).textContent=''

  chatHeader.innerHTML = `
  <img src="${src}" alt="User">
  <div class="name">${name}</div>
`;
  chatHeader.setAttribute("data-user-id", targetUserId);

  const res = await socket.timeout(5000).emitWithAck("chat with", targetUserId);

  if (res.status === "alredy joined") return;

  messages.innerHTML = ""
  if (res.data) {
    messages.insertAdjacentHTML("beforeend", res.data);
  }

 const formMarkup = `
  <form class="input-box">
    <input type="text" placeholder="Type a message" id="input">
    <button type="submit">Send</button>
  </form>
 `
 const previousFormEl = main.querySelector('.input-box')

 if(previousFormEl) main.removeChild(previousFormEl)

  main.insertAdjacentHTML('beforeend', formMarkup)
  const form = main.querySelector('.input-box')
  form.addEventListener("submit", sendMessage);
});

loginForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.querySelector("#email").value;
  const password = document.querySelector("#password").value;
  console.log(email);
  login(email, password);
});
