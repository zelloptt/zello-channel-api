# Zello channels JavaScript SDK

## Usage
See examples in [examples](./examples) folder and documentation in [docs/js](../../docs/js) folder

## Build from sources

### Prerequisites

[Install Node.js 16 LTS](https://nodejs.org/dist/v16.15.1/node-v16.15.1.pkg)

Use [nvm](https://github.com/nvm-sh/nvm#install--update-script) in order to quickly install and switch between the different Node.js versions.


### Install vendor dependencies

```bash
git submodule update --init --recursive
```

### Rebuilding the recorder (optional)

* Note: No need to rebuild the recorder if it was not changed.

Follow installation instructions in README.md file ([Building from sources](https://github.com/zelloptt/opus-recorder#building-from-sources) section) to build from source.

### Rebuilding the player (optional)

* Note: No need to rebuild the player if it was not changed.

```bash
cd src/vendor/pcm-player
npm install
npm run minify
```

### Build the SDK
```bash
npm install
npm run build
```

Check `dist` directory for `*.js` files
