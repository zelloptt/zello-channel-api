package com.zello.sample.ride

enum class Role {

	NONE, RIDER, DRIVER, QA;

	companion object {
		fun fromInt(value: Int): Role {
			return when (value) {
				RIDER.ordinal -> RIDER
				DRIVER.ordinal -> DRIVER
				QA.ordinal -> QA
				else -> NONE
			}
		}
	}

}
