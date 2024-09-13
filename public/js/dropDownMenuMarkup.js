const dropDownMenuMarkup = ` <div class="dropdown-menu">
    <button class="dropdown-trigger button-icon">
      <svg class="icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="8 18 12 22 16 18"></polyline>
        <polyline points="8 6 12 2 16 6"></polyline>
        <line x1="12" x2="12" y1="2" y2="22"></line>
      </svg>
      <span class="sr-only">More options</span>
    </button>
    <div class="dropdown-content">
      <div class="dropdown-item" id="delete-messages">
        <svg class="icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 12H3"></path>
          <path d="M16 6H3"></path>
          <path d="M16 18H3"></path>
          <path d="M21 12h-6"></path>
        </svg>
        Delete Messages
      </div>
      <div class="dropdown-item">
        <svg class="icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="7" height="7" x="14" y="3" rx="1"></rect>
          <path d="M10 21V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H3"></path>
        </svg>
        Block This User
      </div>
      <div class="dropdown-separator"></div>
      <div class="dropdown-item">
        <svg class="icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6 9 17l-5-5"></path>
        </svg>
        Report
      </div>
    </div>
  </div>`;

export default dropDownMenuMarkup;
