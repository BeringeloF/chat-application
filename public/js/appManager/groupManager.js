import { updateGroup } from "../api/updateGroup";
import { createGroup } from "../api/createGroup";
import { leaveGroup, selectNewGroupAdminAndLeave } from "../api/leaveGroup";
import { getUser } from "../api/getUser";

class Group {
  #main = document.querySelector(".main-content");
  myId;
  async displayCreateGroupForm(socket) {
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
      console.log(data);
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
        createGroup(formData, socket);
        console.log("trying to create group...");
      });
    } catch (err) {
      console.error("💥", err);
    }
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

  async displayUpdateGroupForm(socket, e) {
    const room = e.target.closest(".user-item").dataset.room;

    if (room.includes("CHAT") || !e.target.closest(".update-group")) return;
    console.log("displayUpdateGroupFrom was called");

    const groupJson = await fetch(`/api/v1/users/group/${room}`);
    const groupData = (await groupJson.json()).data;
    const res = await fetch("/api/v1/users/getContacts");
    const { data } = await res.json();

    const contacts = data.filter(
      (el) =>
        !groupData.participants.includes(el.id) &&
        !groupData.maybeParticipants.includes(el.id)
    );

    const contactsMarkup = contacts
      .map((el) => {
        return `
       <li data-user-id="${el.id}">
            <img class="user-avatar"src="/img/users/${el.image}">
            <span class="contact-name">${el.name.split(" ")[0]}</span>
            <button class="add-contact-btn">+</button>
       </li>`;
      })
      .join("");

    this.#main.innerHTML = "";

    const editGroupFormMarkup = `
    <div class="div"> 
    <div class="form-container">
          <h2>Editar Grupo </h2>
          <form class='create-group-form' enctype="multipart/form-data">
              <div class="form-group">
                  <label for="group-name">Nome do Grupo:</label>
                  <input type="text" id="group-name" name="name" value="${groupData.name}">
              </div>
              <div class="form-group">
                  <label for="group-description">Descrição do Grupo:</label>
                  <textarea id="group-description" name="description"></textarea>
              </div>
              <div class="form-group">
                  <label for="group-image">Selecione uma nova imagem caso queira alterar a foto do grupo:</label>
                  <input type="file" id="group-image" name="image" accept="image/*">
              </div>
             <input type="hidden" name="participants" id="hidden-input" value="">
              <div class="form-group">
                  <button type="submit">Salvar</button>
              </div>
          </form>
      </div>

      <div class="contacts-container">
          <h3>Adcionar mais pessoas</h3>
          <ul class="contact-list">
             ${contactsMarkup}
          </ul>
      </div>
    </div>
    `;
    this.#main.insertAdjacentHTML("afterbegin", editGroupFormMarkup);
    const listContainer = document.querySelector(".contact-list");
    listContainer.addEventListener("click", this.#addToGroup.bind(this));
    const editGroupForm = this.#main.querySelector(".create-group-form");
    editGroupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(editGroupForm);
      console.log("ROOM", room);
      updateGroup(formData, socket, room);
      console.log("trying to edit group...");
    });
  }

  async displayGroupInformation(e) {
    try {
      const room = e.target.closest(".user-item").dataset.room;
      if (room.includes("CHAT") || !e.target.closest(".show-info")) return;
      console.log(e.target);
      const groupJson = await fetch(
        `/api/v1/users/group/${room}?getParticipantsObj=true`
      );
      const groupData = (await groupJson.json()).data;
      const creator =
        groupData.participants.filter(
          (el) => el.id === groupData.createdBy
        )[0] || (await getUser(groupData.createdBy));

      this.#main.innerHTML = "";
      console.log(creator);
      const participantsMarkup = groupData.participants
        .map((el) => {
          return `
      <div class="dtz-participant">
        <div class="dtz-avatar">
          <img src="/img/users/${el.image}" alt="participant image">
        </div>
        <span>${el.name}</span>
      </div>
      `;
        })
        .join("");
      const markup = `
  
    <div class="dtz-container">
      <div class="dtz-card">
        <div class="dtz-card-header">
          <img src="/img/group/${groupData.image}" alt="Project Alpha Team" class="dtz-group-image">
          <div class="dtz-group-info">
            <h2 class="dtz-group-name">${groupData.name}</h2>
            <p class="dtz-group-description">${groupData.description}</p>
          </div>
        </div>
        <div class="dtz-card-content">
          <div class="dtz-group-creator">
            <h3>Group Creator</h3>
            <div class="dtz-avatar-info">
              <div class="dtz-avatar">
                <img src="/img/users/${creator.image}" alt="Jane Doe">
              </div>
              <span class="dtz-creator-name">${creator.name}</span>
              <span class="dtz-badge">Creator</span>
            </div>
          </div>
          <div class="dtz-participants">
            <h3>Participants (${groupData.participants.length})</h3>
            <div class="dtz-scroll-area">
              ${participantsMarkup}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
      this.#main.innerHTML = markup;
    } catch (err) {
      console.error("ERROR MINE", err);
    }
  }

  async displayLeaveGroupPopUp(e) {
    const room = e.target.closest(".user-item").dataset.room;
    if (room.includes("CHAT") || !e.target.closest(".leave-group")) return;

    const body = document.querySelector("body");

    const groupJson = await fetch(
      `/api/v1/users/group/${room}?getParticipantsObj=true`
    );
    const groupData = (await groupJson.json()).data;
    const id = room.split("-")[1];
    let markup;
    if (this.myId === id && groupData.participants.length > 1) {
      const optionsMarkup = groupData.participants
        .filter((el) => el.id !== id)
        .map((el) => {
          return `<option value="${el.id}">${el.name}</option>`;
        })
        .join("");
      markup = `<div class="xyz-overlay" id="xyz-overlay">
  <div class="xyz-dialog">
    <div class="xyz-dialog-content">
      <div class="xyz-dialog-header">
        <h2 class="xyz-dialog-title">Leave Group</h2>
        <p class="xyz-dialog-description">
          Please select a new admin before leaving the group.
        </p>
      </div>
      <div class="xyz-select-container">
        <select id="xyz-new-admin" class="xyz-select">
              ${optionsMarkup}
        </select>
      </div>
      <div class="xyz-dialog-footer">
        <button id="xyz-cancel-button" class="xyz-button xyz-button-outline">Cancel</button>
        <button id="xyz-leave-button" class="xyz-button xyz-leave-button">Leave Group</button>
      </div>
    </div>
  </div>
</div>`;
    } else {
      markup = `<div id="xyz-modal" class="xyz-overlay">
    <div class="xyz-dialog">
      <div class="xyz-dialog-header">
        <h2 class="xyz-dialog-title">Leave Group</h2>
        <p class="xyz-dialog-description">Are you sure you want to leave the group?</p>
      </div>
      <div class="xyz-dialog-footer">
        <button class="xyz-button-outline">Cancel</button>
        <button class="xyz-button xyz-leave-button">Leave</button>
      </div>
    </div>
  </div>`;
    }

    body.insertAdjacentHTML("beforeend", markup);
    openModal();
    document
      .querySelector(".xyz-button-outline")
      .addEventListener("click", function () {
        closeModal();
      });

    document
      .querySelector(".xyz-leave-button")
      .addEventListener("click", async (e) => {
        const select = document.querySelector("#xyz-new-admin");
        if (select) {
          const newAdmin = select.value;
          if (!newAdmin)
            return alert("you should select a new admin before leaving!");
          selectNewGroupAdminAndLeave({ newAdmin, room });
          closeModal();
        } else {
          leaveGroup(room);
          closeModal();
        }
      });
  }
}

function openModal() {
  document.querySelector(".xyz-overlay").style.display = "flex"; // Show the overlay and modal
}

function closeModal() {
  const overlay = document.querySelector(".xyz-overlay");
  const dialog = document.querySelector(".xyz-dialog");
  overlay.style.display = "none";
  const body = document.querySelector("body");
  body.removeChild(overlay);
}

export default new Group();
