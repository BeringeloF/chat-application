import { viewNotification } from "../apiCalls/markNotificationsAsVisualized";
import dropDownMenuMarkup from "../dropDownMenuMarkup";
import { deleteMessages } from "../apiCalls/deleteMessages";
import { blockUser, unblockUser } from "../apiCalls/blockUser";
import xssFilters from "xss-filters";

class Chat {
  #main = document.querySelector(".main-content");
  myId;
  async displayChat(socket, e) {
    const el = e.target.closest(".user-item");
    if (
      !el ||
      e.target.closest(".user-dropdown-trigger") ||
      e.target.closest(".user-dropdown-content")
    )
      return;

    console.log(
      !el,
      e.target.closest(".user-dropdown-trigger"),
      e.target.closest(".user-dropdown-content")
    );

    const src = el.querySelector(".user-avatar").src;
    const name = el.querySelector(".user-name").textContent;
    const room = el.getAttribute("data-room");
    const isGroup = room.includes("GROUP");
    this.#main.innerHTML = "";

    viewNotification(room);

    //el.querySelector(`.user-message-preview`).textContent = "";

    const chatHeaderMarkup = `
          <div class="chat-header" data-room="${room}">
            <img src="${src}" alt="User" class="foto-user">
            <div class="name">${name}</div>
            ${dropDownMenuMarkup(isGroup)}
          </div>
        `;

    this.#main.insertAdjacentHTML("afterbegin", chatHeaderMarkup);
    this.#main
      .querySelector("#delete-messages")
      .addEventListener("click", this.#deleteMessages.bind(this));

    const res = await socket.timeout(5000).emitWithAck("join", room);

    const blockUserEl = this.#main.querySelector("#block-user");

    if (res.chatBlockedBy === "me") {
      blockUserEl.id = "unblock-user";
      blockUserEl.innerHTML = ` <svg class="icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="7" height="7" x="14" y="3" rx="1"></rect>
          <path d="M10 21V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H3"></path>
        </svg>
        Unblock User`;
      blockUserEl.addEventListener("click", () => {
        unblockUser(room);
      });
    } else {
      blockUserEl?.addEventListener("click", () => {
        blockUser(room);
        setTimeout(() => {
          location.assign("/");
        }, 4000);
      });
    }

    if (res.status === "already joined") return;

    let chatBoxMarkup = `
          <div class="chat-box"></div>
        `;
    if (res.data) {
      chatBoxMarkup = `
          <div class="chat-box">${this.#generatePreviousMessagesMarkup(
            res.data,
            res.myId,
            res.chatBlockedBy
          )}</div>
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
    form.addEventListener("submit", this.#sendMessage.bind(this, socket));
  }

  async #sendMessage(socket, e) {
    e.preventDefault();
    const messages = document.querySelector(".chat-box");
    const input = document.getElementById("input");
    const chatHeader = document.querySelector(".chat-header");
    const message = xssFilters.inHTMLData(input.value);
    if (message.trim()) {
      const room = chatHeader.getAttribute("data-room");
      try {
        await socket.timeout(5000).emitWithAck("chat", message, room);
      } catch (err) {
        console.error("error mine", err);
      }

      const markup = `
        <div class="message sent">
            <div class="text">
              ${message}
            </div>
        </div>
      `;
      messages.insertAdjacentHTML("beforeend", markup);
      input.value = "";
    }
    console.log("enviando");
  }

  displayRecivedMessage(msg, callback) {
    callback({ arrived: true, id: this.myId });
    const messages = document.querySelector(".chat-box");
    let markup;

    if (msg.isFromGroup) {
      console.log("a messagem foi enviada de um grupo");
      console.log(msg);
      markup = `<div class="message received">
         <div>${msg.sendedBy.name}</div>
          <div class="text">
            ${msg.content}
          </div>
      </div>`;
    } else {
      console.log("a messagem não foi enviada de um grupo");
      console.log(msg);
      markup = `
      <div class="message received">
          <div class="text">
            ${msg.content}
          </div>
      </div>
    `;
    }

    messages.insertAdjacentHTML("beforeend", markup);
    window.scrollTo(0, document.body.scrollHeight);
  }

  #generatePreviousMessagesMarkup(messages, id, blockedBy) {
    console.log(messages);
    let alertMarkup;

    if (blockedBy) {
      alertMarkup =
        blockedBy === "me"
          ? `
  <div class="alert-message">
    <span class="icon">⚠️</span>
    <p>Você bloqueou este usuário. Não será possível receber ou enviar mensagens deste usuário até que o desbloqueie!</p>
  </div>
    `
          : `
  <div class="alert-message">
    <span class="icon">⚠️</span>
    <p>Você foi bloqueado por este usuário. Não será possível receber ou enviar mensagens deste usuário até que ele o desbloqueie!</p>
  </div>`;
    }

    const markup = messages.map((msg) => {
      if (msg.sendedBy.id === id) {
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
       ${msg.isFromGroup ? `<div>${msg.sendedBy.name}</div>` : ""}
          <div class="text">
            ${msg.content}
          </div>
      </div>
    `;
    });

    alertMarkup && markup.push(alertMarkup);

    return markup.join(``);
  }

  async #deleteMessages() {
    const room = document.querySelector(".chat-header").dataset.room;
    deleteMessages(room);
  }
}

export default new Chat();
