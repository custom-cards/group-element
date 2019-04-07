# Group Element

An element to group other elements in [Home Assistant](https://github.com/home-assistant/home-assistant) [picture-elements](https://www.home-assistant.io/lovelace/picture-elements/) with dynamic toggle capability.

Perfect for creating dynamic interfaces while reusing UI real-estate.

// todo: video


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

## Using the card

There are many possibe usages to the group element (samples follow below)
1. Build a cleaner user interface by showing relevant controls only when a hot spot is tapped. For example: tap your cover/blinds and show the controls; tap your dimmer and show its controls;
No more clogged UIs or living without full control due to space contraints.
2. Easier positioining - all group children elements position and size are based on % of the group element itself. So if you have a certain element or a set of elements that you reuse you can position them once relative to each other and then move the entire group.
3. Build a dynamic UI - for example a universal remote control taking up very little space. You can combine group-element with group-toggle-button.
4. Eliminates the need to define input_boolean entities just to toggle visibility of UI items. Also gives you freedom to use the interactive interface by multiple users without conflicts of a shared input_boolean entity.

#### Card options
| Name | Type | Default | Since | Description |
|------|------|---------|-------|-------------|
| type | string | **required** | v0.1 | `custom:group-element`
| elements | list | **required** | v0.1 | Elements contained in the group. Any valid element hierarchy of picture-elements.
| toggle_tap | boolean | false | v0.1 | Enable toggling visibility of children elements when tapped.
| visible | boolean | false | v0.1 | Sets initial visibility.

### Example usage

#### Basic setup
<img src="https://user-images.githubusercontent.com/457678/52081816-771c1b00-259b-11e9-8c1e-cfd93ac3e66d.png" width="500px" alt="Basic card example" />

```yaml
- type: custom:mini-media-player
  entity: media_player.kitchen_speakers
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

#### Card with media shortcuts
You can specify media shortcuts through the `shortcuts` option, either as a list or as buttons or why not both?

<img src="https://user-images.githubusercontent.com/457678/53040712-5e0fd700-3482-11e9-9990-6ca13b871f50.png" width="500px" alt="Card with media shortcuts example">

```yaml
- entity: media_player.spotify
  type: custom:mini-media-player
  artwork: cover
  source: icon
  hide:
    volume: true
  shortcuts:
    columns: 4 # Max buttons per row
    buttons:
      # Start predefined playlist
      - icon: mdi:cat
        type: playlist
        id: spotify:user:spotify:playlist:37i9dQZF1DZ06evO2O09Hg
      # Change the source to bathroom
      - icon: mdi:dog
        type: source
        id: Bathroom
      # Trigger script
      - icon: mdi:dog
        type: script
        id: script.script_name
      ... # etc.
```

#### Grouped cards
Set the `group` option to `true` when nesting mini media player cards inside other cards that already have margins/paddings.

<img src="https://user-images.githubusercontent.com/457678/52081831-800cec80-259b-11e9-9b35-63b23805c879.png" width="500px" alt="Grouped cards example" />

```yaml
- type: entities
  entities:
    - type: custom:mini-media-player
      entity: media_player.multiroom_player
      group: true
      source: icon
      info: short
      hide:
        volume: true
        power: true
    - type: custom:mini-media-player
      entity: media_player.kitchen_speakers
      group: true
      hide:
        controls: true
    - type: custom:mini-media-player
      entity: media_player.bathroom_speakers
      group: true
      hide:
        controls: true
    - type: custom:mini-media-player
      entity: media_player.bedroom_speakers
      group: true
      hide:
        controls: true
    - type: custom:mini-media-player
      entity: media_player.patio_speakers
      group: true
      hide:
        controls: true
```

#### Stacked cards
By using vertical and horizontal stacks, you can achieve many different setups.

<img src="https://user-images.githubusercontent.com/457678/52081830-800cec80-259b-11e9-9a77-0e8585c3f71c.png" width="500px" alt="Stacked cards example" />

```yaml
- type: horizontal-stack
  cards:
    - entity: media_player.tv_livingroom
      type: custom:mini-media-player
      info: short
      artwork: cover
      hide:
        mute: true
        icon: true
        power_state: false
    - entity: media_player.tv_bedroom
      type: custom:mini-media-player
      info: short
      artwork: cover
      hide:
        mute: true
        icon: true
        power_state: false
- type: horizontal-stack
  cards:
    - entity: media_player.cc_patio
      type: custom:mini-media-player
      hide:
        icon: true
    - entity: media_player.cc_kitchen
      type: custom:mini-media-player
      hide:
        icon: true
    - entity: media_player.cc_bath
      type: custom:mini-media-player
      hide:
        icon: true
```

#### Speaker_group management
Specify all your speaker entities in a list under the option `speaker_group` -> `entities`. They obviously need to be of the same platform.

* The card does only allow changes to be made to groups where the entity of the card is the coordinator/master speaker.
* Checking a speakers in the list will make it join the group of the card entity. (*`media_player.sonos_office`* in the example below).
* Unchecking a speaker in the list will remove it from any group it's a part of.

<img src="https://user-images.githubusercontent.com/457678/52181170-53511300-27ef-11e9-9d54-aa9c84a96168.gif" width="500px" alt="sonos group management example">

```yaml
- type: custom:mini-media-player
  entity: media_player.sonos_office
  hide:
    power: true
    icon: true
    source: true
  speaker_group:
    platform: sonos
    show_group_count: true
    entities:
      - entity_id: media_player.sonos_office
        name: Sonos Office
      - entity_id: media_player.sonos_livingroom
        name: Sonos Livingroom
      - entity_id: media_player.sonos_kitchen
        name: Sonos Kitchen
      - entity_id: media_player.sonos_bathroom
        name: Sonos Bathroom
      - entity_id: media_player.sonos_bedroom
        name: Sonos Bedroom
```

If you are planning to use the `speaker_group` option in several cards, creating a separate yaml file for the list is highly recommended, this will result in a less cluttered `ui-lovelace.yaml` and also make the list easier to manage and maintain.
You then simply reference the file containing the list using `entities: !include filename.yaml` for every occurrence of `entities` in your `ui-lovelace.yaml`.

This is however only possible when you have lovelace mode set to yaml in your HA configuration, see [Lovelace YAML mode](https://www.home-assistant.io/lovelace/yaml-mode/) for more info.

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
