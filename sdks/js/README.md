# Zello channels JavaScript SDK

## Usage
See examples in `examples` folder and documentation in `/docs/js` folder

## Build from sources

### install dependencies
```bash
> npm install
```

### install vendor dependencies

#### opus-to-pcm
No need to install, just clone

```bash
> cd src/vendor
git clone git@github.com:zelloptt/opus-to-pcm.git
``` 

#### pcm-player
No need to install, just clone

```bash
> cd src/vendor
git clone git@github.com:zelloptt/pcm-player.git
```

#### opus-recorder
##### Clone 
```bash
> cd src/vendor
git clone git@github.com:zelloptt/opus-recorder.git
cd opus-recorder
```

##### Follow installation instructions in README.md file ([Building from sources](https://github.com/megamk/opus-recorder#building-from-sources) section) to build from source

##### Rebuild recorder
```bash
npm run make recorder
```


### build with webpack
```bash
./node_modules/.bin/webpack
```

Check `distr` directory for `*.js` files
