const dropDownMenuMarkup = (img) => {
  return `
<button class="user-dropdown-trigger">
        <img class="user-avatar" src="img/${img}" alt="User Avatar">
      </button>
      <div class="user-dropdown-content">
        <div class="user-dropdown-item">
          <svg class="icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 16l4-4-4-4M21 12H9"></path>
          </svg>
          <span>Leave the group</span>
        </div>
        <div class="user-dropdown-item">
          <svg class="icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
          </svg>
          <span>Update group</span>
        </div>
        <div class="user-dropdown-item">
          <svg class="icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 16v-4"></path>
            <path d="M12 8h.01"></path>
          </svg>
          <span>Show more info</span>
        </div>
      </div>
`;
};

export default dropDownMenuMarkup;
