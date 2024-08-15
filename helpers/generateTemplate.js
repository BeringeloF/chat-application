const generateTemplate = (messages, id) => {
  return messages
    .map((msg) => {
      if (msg.sendBy === id) {
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
            <div class="text">
              ${msg.content}
            </div>
        </div>
      `;
    })
    .join(``);
};

export default generateTemplate;
