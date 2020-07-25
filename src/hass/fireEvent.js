export const fireEvent = (node, type, detail) => {
  detail = detail === null || detail === undefined ? {} : detail;
  const event = new Event(type, {
    bubbles: true,
    cancelable: false,
    composed: true
  });
  event.detail = detail;
  node.dispatchEvent(event);
  return event;
};
