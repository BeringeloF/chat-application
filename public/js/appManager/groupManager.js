import { updateGroup } from "../api/updateGroup";
import { createGroup } from "../api/createGroup";

class Group {
  #main = document.querySelector(".main-content");

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
    if (!room.includes("GROUP") || !e.target.classList.contains("user-avatar"))
      return;

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
}

export default new Group();
