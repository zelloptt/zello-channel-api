# Zello channels JavaScript SDK

## Usage
See examples in [examples](./examples) folder and documentation in [docs/js](../../docs/js) folder

## Build from sources

### Prerequisites

`npm` version at least `v8.1.0`

`node` version at least `v17.0.1`


### Install vendor dependencies

1. opus-to-pcm
2. pcm-player
3. opus-recorder

No need to install, just clone:

```bash
cd src/vendor
git clone git@github.com:zelloptt/opus-to-pcm.git
git clone git@github.com:zelloptt/pcm-player.git
git clone git@github.com:zelloptt/opus-recorder.git
```

### Rebuilding the recorder (optional)

* Note: No need to rebuild the recorder if it was not changed.

Follow installation instructions in README.md file ([Building from sources](https://github.com/zelloptt/opus-recorder#building-from-sources) section) to build from source.

### Build the SDK
```bash
npm install
npm run build
```

Check `dist` directory for `*.js` files
