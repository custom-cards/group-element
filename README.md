# Group Element

An element to group other elements in [Home Assistant](https://github.com/home-assistant/home-assistant) [picture-elements](https://www.home-assistant.io/lovelace/picture-elements/) with dynamic toggle capability.

Perfect for creating dynamic interfaces while reusing UI real-estate.

[![Group demo](http://github.com/yosilevy/group-element/docs/Group1.gif)](https://youtu.be/cGAN1YqO9hY)

## Using the card

There are many possibe usages to the group element (samples follow below)
1. Build a cleaner user interface by showing relevant controls only when a hot spot is tapped. For example: tap your cover/blinds and show the controls; tap your dimmer and show its controls; 
No more clogged UIs or living without full control due to space contraints.
2. Easier positioining - all group children elements position and size are based on % of the group element itself. So if you have a certain element or a set of elements that you reuse you can position them once relative to each other and then move the entire group.
3. Build a dynamic UI - for example a universal remote control (TV/Receiver/STB) taking up very little space. You can combine group-element with group-toggle-button (coming soon).
4. Eliminates the need to define input_boolean entities just to toggle visibility of UI items. Also gives you freedom to use the interactive interface by multiple users without conflicts of a shared input_boolean entity.

#### Element options
| Name | Type | Default | Since | Description |
|------|------|---------|-------|-------------|
| type | string | **required** | v0.1 | `custom:group-element`
| elements | list | **required** | v0.1 | Elements contained in the group. Any valid element hierarchy of picture-elements.
| toggle_tap | boolean | false | v0.1 | Enable toggling visibility of children elements when tapped.
| visible | boolean | true | v0.1 | Sets initial visibility.
| grouping_code | numeric | -1 | v0.1 | Sets a code that controls which groups are mutually exclusive. Only a single group with the same code may be shown at once (only works within the same level)

#### Elements position options (elements_pos)

Sets the position for the elements to allow separation between hot spot for toggle tap and elements display.
All positions are relative to the group parent and not to the group.

| Name | Type | Default | Since | Description |
|------|------|---------|-------|-------------|
| left/right | string | | v0.1 | Sets the left position of the element container.
| top | string | | v0.1 | Sets the top position of the element container.
| width | string | | v0.1 | Sets the width position of the element container.
| height | string | | Sets the height position of the element container.
| any other style | string | | v0.1 | Sets additional style properties on the element container.

#### Close_button object (close_button)

Optional button that hides the group

| Name | Type | Default | Since | Description |
|------|------|---------|-------|-------------|
| show | boolean | false | v0.1 | Show the close button to enable closing the group (regardless of toggle_tap).
| icon | string | hass:close | v0.1 | Sets the icon to show on the close button.

#### Style object (style)

Optional styles for the close button

| Name | Type | Default | Since | Description |
|------|------|---------|-------|-------------|
| left/right | string |  | v0.1 | Sets the left position of the close button (CSS).
| top | string | | v0.1 | Sets the top position of the close button (CSS).
| any other style | string | | v0.1 | Sets additional style properties on the close button.

### Example usage

#### Basic setup
Group controls in a group that is initially hidden and shows when tapped

//todo: update image
<img src="https://user-images.githubusercontent.com/457678/52081816-771c1b00-259b-11e9-8c1e-cfd93ac3e66d.png" width="500px" alt="Basic card example" />

```yaml
- type: picture-elements
  image: /local/living-room.jpg
  elements:
    type: 'custom:group-element'
    toggle_tap: true
    visible: false
    style:
      height: 40%
      left: 41%
      top: 30%
      width: 25%
    - elements:
        # your elements go here - their % size/position is inside the group
```

#### Compact card
Setting either `volume` and/or `controls` to `true` in the `hide` option object will render the player as a single row.

<img src="https://user-images.githubusercontent.com/457678/53042774-569efc80-3487-11e9-8242-03d388d40c34.png" width="500px" alt="Compact card example" />

```yaml
- type: custom:mini-media-player
  entity: media_player.example
  icon: mdi:spotify
  artwork: cover
  hide:
    volume: true
    source: true
    power_state: false
```

## Install

### Simple install

1. Download and copy `group-element-bundle.js` from the [latest release](https://github.com/yosilevy/group-element/releases/latest) into your `config/www` directory.

2. Add a reference to `group-element-bundle.js` in lovelace.

  ```yaml
  resources:
    - url: /local/group-element-bundle.js?v=0.1.0
      type: module
  ```
To do this, go to Configure UI -> Raw Config Editor and paste this under resources or use [YAML Mode](https://www.home-assistant.io/lovelace/yaml-mode/) (not recommended))

### CLI install

1. Move into your `config/www` directory

2. Grab `group-element-bundle.js`

  ```console
  $ wget https://github.com/yosilevy/group-element/releases/download/v0.1.0/group-element-bundle.js
  ```

3. Add a reference to `group-element-bundle.js` inside your `ui-lovelace.yaml`.

  ```yaml
  resources:
    - url: /local/group-element-bundle.js?v=0.1.0
      type: module
  ```

### *(Optional)* Add to custom updater

1. Make sure you have the [custom_updater](https://github.com/custom-components/custom_updater) component installed and working.

2. Add a new reference under `card_urls` in your `custom_updater` configuration in `configuration.yaml`.
//todo: implement tracker
  ```yaml
  custom_updater:
    card_urls:
      - https://raw.githubusercontent.com/yosilevy/group-element/master/tracker.json
  ```

## Updating
1. Find your `group-element-bundle.js` file in `config/www` or wherever you ended up storing it.

2. Replace the local file with the latest one attached in the [latest release](https://github.com/yosilev/group-element/releases/latest).

3. Add the new version number to the end of the cards reference url in your `ui-lovelace.yaml` like below.

  ```yaml
  resources:
    - url: /local/group-element-bundle.js?v=0.1.0
      type: module
  ```

*You may need to empty the browsers cache if you have problems loading the updated card.*

## Getting errors?
Make sure you have `javascript_version: latest` in your `configuration.yaml` under `frontend:`.

Make sure you have the latest version of `group-element-bundle.js`.

If you have issues after updating the card, try clearing your browsers cache or restart Home Assistant.

If you get "Custom element doesn't exist: group-element" or running older browsers try replacing `type: module` with `type: js` in your resource reference, like below.

```yaml
resources:
  - url: ...
    type: js
```

## License
This project is under the Apache 2.0 license.
