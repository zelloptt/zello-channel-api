package com.zello.channel.sdk.platform;

import org.jetbrains.annotations.NotNull;

/**
 * @exclude Not for public use
 */
public class Arrays {

	public static void fill(byte[] array, byte value) {
		java.util.Arrays.fill(array, value);
	}

	public static boolean copy(byte[] src, int srcPosition, int length, byte[] dst, int dstPosition) {
		if (src != null && dst != null && srcPosition >= 0 && dstPosition >= 0 && src.length >= srcPosition + length && dst.length >= dstPosition + length) {
			System.arraycopy(src, srcPosition, dst, dstPosition, length);
			return true;
		}
		return false;
	}

	public static byte[] join(byte[] array1, byte[] array2) {
		if (array1 != null && array2 != null) {
			byte[] buffer = Algorithms.createByteArray(array1.length + array2.length);
			copy(array1, 0, array1.length, buffer, 0);
			copy(array2, 0, array2.length, buffer, array1.length);
			return buffer;
		}
		return null;
	}

	public static byte[] join(byte[][] arrays) {
		if (arrays != null) {
			int n = 0;
			for (byte[] array : arrays) {
				if (array != null) {
					n += array.length;
				}
			}
			byte[] buffer = Algorithms.createByteArray(n);
			int i = 0;
			for (byte[] array : arrays) {
				if (array != null) {
					copy(array, 0, array.length, buffer, i);
					i += array.length;
				}
			}
			return buffer;
		}
		return null;
	}

	public static @NotNull short[] join(@NotNull short[] array1, @NotNull short[] array2) {
		short[] buffer = Algorithms.createShortArray(array1.length + array2.length);
		System.arraycopy(array1, 0, buffer, 0, array1.length);
		System.arraycopy(array2, 0, buffer, array1.length, array2.length);
		return buffer;
	}

	public static @NotNull short[] chunk(@NotNull short[] array, int offset, int length) {
		if (offset >= 0 && length >= 0 && offset + length <= array.length) {
			short[] tmp = Algorithms.createShortArray(length);
			System.arraycopy(array, offset, tmp, 0, length);
			return tmp;
		}
		return Algorithms.createShortArray(0);
	}

	public static short[] deinterleave(short[] array, int stride, int offset) {
		short[] retval = new short[array.length / stride];
		for (int indexIn = offset, indexOut = 0; indexIn < array.length; indexIn += stride, ++indexOut) {
			retval[indexOut] = array[indexIn];
		}
		return retval;
	}

}
