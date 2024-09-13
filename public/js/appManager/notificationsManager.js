import { viewNotification } from "../api/markNotificationsAsVisualized";
import { denyGroupInvitation } from "../api/denyGroupInvitation";
import { acceptChatInvitation } from "../api/acceptChatInvitation";

class Notification {
  #main = document.querySelector(".main-content");
  #notificationCountEl = document.getElementById("notification-count");
  myId;
  renderChatNotification(notification) {
    const list = document.querySelector(".user-list");
    if (Array.isArray(notification)) {
      const markup = notification.map((el) => {
        const userItem = document.querySelector(
          `.user-item[data-room="${el.room}"]`
        );
        if (userItem) list.removeChild(userItem);

        return this.#generateChatNMarkup(el);
      });
      list.insertAdjacentHTML("afterbegin", markup);
    } else {
      const markup = this.#generateChatNMarkup(notification);
      const userItem = document.querySelector(
        `.user-item[data-room="${notification.room}"]`
      );
      if (userItem) list.removeChild(userItem);
      list.insertAdjacentHTML("afterbegin", markup);
    }
  }

  #generateChatNMarkup(notification) {
    return `
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
  }

  async renderServerNotifications() {
    this.#main.innerHTML = "";
    this.#notificationCountEl.classList.remove("show");
    const res = await fetch("/api/v1/users/notifications");
    const { data } = await res.json();
    const notificationsMarkup = data.serverNotifications
      .map((el) => this.#generateServerNMarkup(el, el.context))
      .join("");
    const markup = `<div class="notification-container">${notificationsMarkup}</div>`;
    this.#main.innerHTML = markup;
    const notificationContainer = document.querySelector(
      ".notification-container"
    );
    notificationContainer.addEventListener(
      "click",
      this.#agreedToJoin.bind(this)
    );
    notificationContainer.addEventListener(
      "click",
      this.#refuseToJoin.bind(this)
    );
  }

  #generateServerNMarkup(notification, context) {
    if (context === "invite to group") {
      return `<div class="notification-card">
    <div class="user-photo">
        <img src="/img/users/${
          notification.triggeredBy.image
        }" alt="User Photo">
    </div>
    <div class="notification-content">
        <div class="user-info">
            <p class="user-name">${
              notification.triggeredBy.name.split(" ")[0]
            }</p>
            <div class="invitation-container">
              <p>Do you want to accept ${
                notification.triggeredBy.name.split(" ")[0]
              }'s invitation to join the group?</p>
              <div class="button-group">
                  <button class="accept-invitation" data-room="${
                    notification.room
                  }" >Accept</button>
                  <button class="deny-invitation" data-room="${
                    notification.room
                  }">Deny</button>
              </div>
        </div>
        </div>

    </div>
</div>`;
    }
    if (context === "invite to chat") {
      return `<div class="notification-card">
    <div class="user-photo">
        <img src="/img/users/${
          notification.triggeredBy.image
        }" alt="User Photo">
    </div>
    <div class="notification-content">
        <div class="user-info">
            <p class="user-name">${
              notification.triggeredBy.name.split(" ")[0]
            }</p>
            <div class="invitation-container">
              <p>Do you want to accept ${
                notification.triggeredBy.name.split(" ")[0]
              }'s invitation to join the group?</p>
              <div class="button-group">
                  <button class="accept-invitation" data-user-id="${
                    notification.triggeredBy.id
                  }" >Accept</button>
                  <button class="deny-invitation" data-user-id="${
                    notification.triggeredBy.id
                  }">Deny</button>
              </div>
        </div>
        </div>

    </div>
</div>`;
    }
  }
  async #agreedToJoin(e) {
    if (!e.target.classList.contains("accept-invitation")) return;
    if (!e.target.dataset.userId) {
      const room = e.target.dataset.room;
      const resJ = await fetch(`/api/v1/users/joinToGroup/${room}`);
      const res = await resJ.json();
      console.log(res);
      await viewNotification(room, true);
    } else {
      const id = e.target.dataset.userId;
      const room = await acceptChatInvitation(id);
      await viewNotification(room, true);
    }
    console.log("accepting invitation...");
  }
  async #refuseToJoin(e) {
    if (!e.target.classList.contains("deny-invitation")) return;
    if (!e.target.dataset.userId) {
      const room = e.target.dataset.room;
      console.log(room);
      await denyGroupInvitation(room);
      await viewNotification(room, true);
      location.assign("/");
    } else {
      const id = e.target.dataset.userId;
      console.log(this.myId);
      const room = `CHAT-${id}-${this.myId}`;
      await viewNotification(room, true);
    }
  }

  updateServerNotificationsCount(notification) {
    this.#notificationCountEl.textContent =
      +this.#notificationCountEl.textContent + 1;
    this.#notificationCountEl.classList.add("show");
  }

  async getNotifications() {
    const res = await fetch("/api/v1/users/notifications");
    const { data } = await res.json();
    console.log("notifications:", data);

    if (data.chatNotifications.length > 0)
      this.renderChatNotification(data.chatNotifications);
    if (data.serverNotifications.length > 0) {
      this.#notificationCountEl.textContent = data.serverNotifications.length;
      this.#notificationCountEl.classList.add("show");
    }
  }
}

const notificationManager = new Notification();

export default notificationManager;
