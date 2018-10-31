#ifndef _CONTEXT_H_
#define _CONTEXT_H_

#include "guard.h"

template<typename T>
class CContexts
{
	int m_nContexts;
	static const int m_nStep = 10;
	T** m_pContexts;
	pthread_mutex_t m_Mutex;

	int AllocateInt(T* pContext)
	{
		if (pContext)
		{
			if (m_pContexts)
			{
				for (int i = 0; i < m_nContexts; ++i)
				{
					if (!m_pContexts[i])
					{
						m_pContexts[i] = pContext;
						return i + 1;
					}
				}
			}
			int nContexts = m_nContexts + m_nStep;
			T** pContexts = new T*[nContexts];
			if (m_pContexts)
			{
				for (int i = 0; i < m_nContexts; ++i)
				{
					pContexts[i] = m_pContexts[i];
				}
			}
			for (int i = m_nContexts; i < nContexts; ++i)
			{
				pContexts[i] = 0;
			}
			m_nContexts = nContexts;
			if (m_pContexts) {
				delete [] m_pContexts;
			}
			m_pContexts = pContexts;
			return AllocateInt(pContext);
		}
		return 0;
	}

public:
	CContexts() :
		m_nContexts(0),
		m_pContexts(0)
	{
		pthread_mutex_init(&m_Mutex, 0);
	}

	~CContexts()
	{
		delete[] m_pContexts;
		pthread_mutex_destroy(&m_Mutex);
	}

	T* Get(int iId)
	{
		CGuard Guard(m_Mutex);
		if (m_pContexts != 0 && iId > 0 && iId <= m_nContexts)
			return m_pContexts[iId - 1];
		return 0;
	}

	int Allocate(T* pContext)
	{
		if (pContext)
		{
			CGuard Guard(m_Mutex);
			return AllocateInt(pContext);
		}
		return 0;
	}

	T* Release(int iId)
	{
		CGuard Guard(m_Mutex);
		if (m_pContexts != 0 && iId > 0 && iId <= m_nContexts)
		{
			--iId;
			T* p = m_pContexts[iId];
			m_pContexts[iId] = 0;
			return p;
		}
		return 0;
	}

};

#endif
