const { createApp, ref, reactive, computed } = Vue

const App = {
  setup() {
    const isLoggedIn = ref(false)
    const loading = ref(false)
    const showQRCode = ref(false)
    const themeMode = ref('light')
    const formData = reactive({
      username: '',
      password: '',
      remember: false
    })

    let tabId = 0
    const tabValue = ref('')
    const tabData = ref([])

    const addTab = (label) => {
      const value = `tab_${tabId++}`
      tabData.value.push({
        value,
        label,
        removable: true
      })
      tabValue.value = value
      return value
    }

    const ensureTab = (label) => {
      const exists = tabData.value.find(t => t.label === label)
      if (exists) {
        tabValue.value = exists.value
        return exists.value
      }
      return addTab(label)
    }

    const removeTab = ({ value, index }) => {
      if (index < 0) return false
      tabData.value.splice(index, 1)
      if (tabData.value.length === 0) {
        tabValue.value = ''
        return
      }
      if (tabValue.value === value) {
        tabValue.value = tabData.value[Math.max(index - 1, 0)].value
      }
    }

    const handleMenuClick = (value) => {
      const labelMap = {
        dashboard: '概况',
        applications: '预约表单',
        statistics: '数据统计',
        settings: '系统设置'
      }
      ensureTab(labelMap[value] || value)
    }

    const handleLogin = async () => {
      if (!formData.username || !formData.password) {
        TDesign.MessagePlugin.error('请输入用户名和密码')
        return
      }

      loading.value = true

      setTimeout(() => {
        loading.value = false
        isLoggedIn.value = true
        ensureTab('概况')
        TDesign.MessagePlugin.success('登录成功！')
      }, 1500)
    }

    const handleQRLogin = () => {
      showQRCode.value = !showQRCode.value
    }

    const setTheme = (mode) => {
      themeMode.value = mode
      if (mode === 'dark') {
        document.documentElement.classList.add('tdesign-theme__dark')
      } else {
        document.documentElement.classList.remove('tdesign-theme__dark')
      }
    }

    const minimizeWindow = () => {
      window.electronAPI.minimize()
    }

    const maximizeWindow = () => {
      window.electronAPI.maximize()
    }

    const closeWindow = () => {
      window.electronAPI.close()
    }

    const handleLogout = () => {
      isLoggedIn.value = false
      tabData.value = []
      tabValue.value = ''
      formData.username = ''
      formData.password = ''
      formData.remember = false
      TDesign.MessagePlugin.info('已退出登录')
    }

    // 预约表单示例数据
    const appointmentColumns = [
      { colKey: 'name', title: '申请人', width: 100 },
      { colKey: 'phone', title: '联系电话', width: 130 },
      { colKey: 'location', title: '打捞位置', ellipsis: true },
      { colKey: 'weight', title: '预估重量(kg)', width: 130 },
      { colKey: 'time', title: '预约时间', width: 170 },
      { colKey: 'status', title: '状态', width: 100 },
      { colKey: 'operation', title: '操作', width: 120 }
    ]

    const appointmentData = ref([
      { id: 1, name: '张建国', phone: '138****5678', location: '长江入海口东侧水域', weight: '850', time: '2026-06-05 09:00', status: '待受理' },
      { id: 2, name: '李明辉', phone: '159****2341', location: '珠江口航道附近', weight: '1200', time: '2026-06-05 14:00', status: '待受理' },
      { id: 3, name: '王大海', phone: '177****8902', location: '舟山群岛北侧海域', weight: '2000', time: '2026-06-06 10:30', status: '正在处理' },
      { id: 4, name: '赵远洋', phone: '136****4567', location: '渤海湾天津港外', weight: '600', time: '2026-06-04 08:00', status: '已处理' },
      { id: 5, name: '陈航海', phone: '150****6789', location: '厦门湾外海', weight: '1500', time: '2026-06-03 13:00', status: '已评价' },
      { id: 6, name: '刘水利', phone: '182****3456', location: '长江南京段水域', weight: '450', time: '2026-06-07 11:00', status: '待受理' },
      { id: 7, name: '孙远航', phone: '138****9012', location: '青岛港外锚地', weight: '3000', time: '2026-06-04 16:00', status: '已处理' },
      { id: 8, name: '周海洋', phone: '155****7890', location: '北部湾海域', weight: '900', time: '2026-06-06 15:00', status: '正在处理' }
    ])

    const handleViewAppointment = (row) => {
      TDesign.MessagePlugin.info(`查看预约单: ${row.row.name}`)
    }

    const handleProcessAppointment = (row) => {
      TDesign.MessagePlugin.success(`开始处理 ${row.row.name} 的预约单`)
    }

    const currentTabLabel = computed(() => {
      const tab = tabData.value.find(t => t.value === tabValue.value)
      return tab ? tab.label : ''
    })

    return {
      isLoggedIn,
      loading,
      showQRCode,
      themeMode,
      formData,
      tabValue,
      tabData,
      currentTabLabel,
      addTab,
      removeTab,
      handleMenuClick,
      handleLogin,
      handleQRLogin,
      setTheme,
      handleLogout,
      minimizeWindow,
      maximizeWindow,
      closeWindow,
      appointmentColumns,
      appointmentData,
      handleViewAppointment,
      handleProcessAppointment
    }
  }
}

const app = createApp(App)
app.use(TDesign)
app.mount('#app')
