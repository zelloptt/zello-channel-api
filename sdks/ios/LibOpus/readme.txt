libopus library build process on Mac OS X Sierra
================================================

Make sure that XCode command line build tools are installed:
$ xcode-select --install

Try to build libopus using the command line:
$ cd <ios project root>/LibOpus
$ bash build-libopus.sh

The build process will fail at the configiure stage for the first simulator architecture it comes across (either i386 or x86_64). The error message will point at configure:3724 and claim that "it cannot run C compiled programs".

As a temporary remedy, we can modify the configure script to not fail when it can't run the generated executables.

1. Locate <ios project root>/LibOpus/build/src/opus-1.1.3/configure which was unpacked during the initial unsuccessful run of the build script.

2. Edit it to replace lines 3726-3729:

   as_fn_error $? "cannot run C compiled programs.
   If you meant to cross compile, use \`--host'.
   See \`config.log' for more details" "$LINENO" 5; }

with the following line:

   cross_compiling=no }

This will mark the simulator architectures as not cross-compiling and let the configure finish it's job.

3. Locate <ios project root>/LibOpus/build-libopus.sh.

4. Comment out line 99:

#tar zxf opus-${VERSION}.tar.gz -C $SRCDIR

5. Comment out line 202:

#rm -fr "${SRCDIR}/opus-${VERSION}"

6. Run the build script again:

$ bash build-libopus.sh
