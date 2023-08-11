// axios二次封装
// yarn add axios-adapter-uniapp import axiosAdapterUniapp from 'axios-adapter-uniapp'
import { getToken } from '@/utils/auth'
import axios from 'axios'
// 小程序axios适配器
import mpAdapter from 'axios-miniprogram-adapter'
axios.defaults.adapter = mpAdapter

//根据环境变量获取api地址
let baseURL =
  process.env.NODE_ENV == 'development'
    ? '/api'
    : JSON.parse(process.env.VITE_BASE_URL)
// let evnName = process.env.config[process.env.UNI_SCRIPT] 获取当前处于哪个开发环境
console.log('baseURL:', process.env, '++++++++++++++++++++++++')

class HttpRequest {
  constructor () {
    this.baseURL = baseURL // 从环境变量中获取api地址
    this.timeout = 300000
  }
  mergeOptions (options) {
    return {
      baseURL,
      timeout: 300000,
      ...options
    }
  }
  request (options) {
    const instance = axios.create()
    this.setInterceptors(instance)
    const opts = this.mergeOptions(options)
    return instance(opts)
  }
  get (url, data = {}, outHeaders = {}) {
    // console.log(data, "data+++++++++++++");
    return this.request({
      dataType: 'json',
      method: 'get',
      url,
      params: { ...data }, // get参数可以直接展开
      headers: outHeaders
    })
  }
  post (url, data = {}, outHeaders = {}) {
    // 请求体中 {}
    return this.request({
      method: 'post',
      url,
      data, // post要求必须传入data属性
      headers: outHeaders
    })
  }

  // 设置拦截器
  setInterceptors (instance) {
    // 请求拦截器
    instance.interceptors.request.use(config => {
      const noLoading = config.headers['NO-LOADING']
      // 是否需要设置 token
      const isToken = config.headers['ISTOKEN'] || false
      if (getToken() && isToken) {
        config.headers['Cookie'] = `${getToken()}`
      }
      if (!noLoading) {
        uni.showLoading({
          title: '加载中...'
        })
      }
      config.headers = {
        ...config.headers
      }
      //console.log('config',config)
      return config
    })
    // 响应拦截器
    instance.interceptors.response.use(
      res => {
        const noLoading = res.config.headers['NO-LOADING']
        if (!noLoading) {
          setTimeout(() => uni.hideLoading(), 500)
        }
        let { data } = res
        // console.log("请求获取data", data)
        if (data) {
          if (data.code === 0) {
            //console.log('data=============', data)
            return Promise.resolve(data)
          } else if (data.code === 201 || data.code == 301) {
            // 未登录、登录超时
            uni.showToast({
              title: data.msg,
              icon: 'none'
            })
            const pages = getCurrentPages() // 获取栈实例
            if (pages.length > 0) {
              let currentPage = pages[pages.length - 1]['$page']['fullPath']
              uni.setStorage({
                key: 'def_url',
                data: currentPage,
                success: () => {
                  uni.reLaunch({ url: '/pages/login/index' })
                }
              })
            } else uni.reLaunch({ url: '/pages/login/index' })
            // return Promise.resolve(data)
          }
        }
      },
      err => {
        console.log('axios报错', err)
        uni.hideLoading()
        return Promise.reject(err)
      }
    )
  }
}

export default new HttpRequest()
