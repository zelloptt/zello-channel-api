#pragma once

#include <pthread.h>

class CGuard
{
	pthread_mutex_t& m_Mutex;
public:
	CGuard(pthread_mutex_t& Mutex) :
		m_Mutex(Mutex)
	{
		pthread_mutex_lock(&m_Mutex);
	}
	~CGuard()
	{
		pthread_mutex_unlock(&m_Mutex);
	}
};
