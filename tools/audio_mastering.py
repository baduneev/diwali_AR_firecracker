"""Offline editing of real recordings; shared by the asset builder and its tests."""
import numpy as np
RATE=48000
def master(samples, prefix=None, gain=.4, tail=.25):
    a=np.asarray(samples,dtype=np.float32).copy()
    if a.ndim!=1 or not a.size or not np.all(np.isfinite(a)) or np.max(np.abs(a))<1e-7:
        raise ValueError('A real, finite, non-silent mono recording is required')
    if not 0<gain<.89 or tail<0:raise ValueError('Invalid mastering gain or tail')
    a*=gain/float(np.max(np.abs(a)))
    edge=min(480,len(a)//2)
    if edge:
        a[:edge]*=np.linspace(0,1,edge);a[-edge:]*=np.linspace(1,0,edge)
    p=np.asarray(prefix,dtype=np.float32).copy() if prefix is not None else np.zeros(0,dtype=np.float32)
    if p.ndim!=1 or not np.all(np.isfinite(p)):raise ValueError('Invalid prefix')
    return np.clip(np.concatenate([p,a,np.zeros(round(tail*RATE),dtype=np.float32)]),-.89,.89)
