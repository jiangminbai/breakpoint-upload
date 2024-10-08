# 断点续传

### 背景

在进行大文件上传时，由于网络具有不稳定性，导致上传过程中有可能会发生异常而被终止，用户不得不重新开始上传。为了避免用户耗费大量时间，大文件上传需要支持断点续传的功能，即使文件因为网络原因而被迫中断，用户也可以从文件中断的位置继续上传。

### 断点续传

1. 文件分片：使用blob.prototype.slice切分文件数据
2. 分片数据上传(串行上传)和合并请求
3. server端：分片数据接收和合并处理
4. 进度条(文件分片上传完成数量/分片总数量)，不存在进度条倒退现象
5. 暂停上传(主动暂停和被动暂停)和恢复上传

### 问答

#### 文件hash如何计算？
1. 第一种方案使用文件内容的md5计算hash。但是缺点是hash计算非常耗时。
2. 第二种方案使用`文件名 + 文件大小 + 文件修改时间`来计算hash。

#### 大文件出现内存泄漏的问题

大文件在前端处理过程中是存在内存中的，容易造成内存泄漏。可以采用indexedDB来处理。