import TreeCtrl from './tree'
import { jsonFlat } from 'infinite-ui/packages/utils/index'
export default {
  props: {
    defaultProps: {
      type: Object,
      default: () => {
        return {
          children: 'children',
          label: 'label'
        }
      }
    },
    treeData: { // 数据源
      type: Array,
      default: () => []
    },
    showCheckbox: { // 是否现实复选框
      type: Boolean,
      default: false
    },
    defaultExpandAll: { // 默认展开所有节点
      type: Boolean,
      default: false
    },
    defaultExpandedKeys: { // 默认展开的节点
      type: Array,
      default: () => []
    },
    nodeKey: { // 节点数据中的字段名称，必须唯一
      type: String,
      default: 'id'
    },
    isEditNode: { // 是否可编辑树节点
      type: Boolean,
      default: false
    },
    draggable: {// 是否可拖拽
      type: Boolean,
      default: false
    },
    editComponentSize: {
      type: String,
      default: 'mini'
    },
    treeLine: {
      type: Boolean,
      default: true
    },
    // 编辑中的输入框
    editInputs: {
      type: Array,
      default: () => [
        {
          placeholder: '请输入节点名称',
          vilidateError: '',
          validateFun: value => {
            return !value ? '节点名称不能为空' : ''
          }
        }
      ]
    }
  },
  methods: {
    remove (data) {
      this.$refs.infiniteTreeRef.remove(data)
      this.addNotChildrenNodeAttr()
    },
    append (data, parentNode) {
      this.$refs.infiniteTreeRef.append(data, parentNode)
      this.addNotChildrenNodeAttr()
    },
    insertBefore (data, refNode) {
      console.log(this)
      this.$refs.infiniteTreeRef.insertBefore(data, refNode)
      this.addNotChildrenNodeAttr()
    },
    insertAfter (data, refNode) {
      this.$refs.infiniteTreeRef.insertAfter(data, refNode)
      this.addNotChildrenNodeAttr()
    },
    // 设置高亮节点
    setHighlightNode (dataKey, status = true) {
      // 数组高亮方法
      if (Array.isArray(dataKey)) {
        dataKey.forEach(key => {
          this.$set(this.highlightNodeMap, key, status)
        })
      } else {
        this.$set(this.highlightNodeMap, dataKey, status)
      }
    },
    // 设置无子节点的dom属性标识
    addNotChildrenNodeAttr () {
      this.$nextTick(() => {
        const treeNodes = this.$refs.infiniteTreeRef.$el.querySelectorAll('.el-tree-node')
        treeNodes.forEach(el => {
          const cDom = el.querySelector('.el-tree-node__children')
          el.setAttribute('not-children', cDom === null || cDom.innerHTML === '')
        })
      })
    },
    // 节点展开时
    nodeExpand () {
      this.addNotChildrenNodeAttr()
    },
    // input校验规则
    validateInput (item, index) {
      const editInputMapIndex = this.editInputMap[index]
      editInputMapIndex.validateError = item.validateFun ? item.validateFun(editInputMapIndex.value) : ''
    },
    // 获取分割节点名称
    getSplitNames (name) {
      return name.replace(')(', '$').replace('(', '$').replace(')', '').split('$')
    },
    // 判断当前层级是否存在相同资源
    isSameNodeName (value, currentData, peerDatas) {
      return peerDatas
        .map(
          (c) => c[[this.defaultProps.label]].split('(')[0] === value && c[this.nodeKey] !== currentData[this.nodeKey]
        )
        .some((c) => c === true)
    },
    // 清除记录的操作节点信息
    clearRecordNode () {
      this.operationNode = null
      this.peerOperationNodes = null
    },
    // 是否操作中判断
    isInOperation (cb) {
      if (this.operationNode) {
        this.$message.error('请先完成当前操作')
        return
      }
      cb && cb()
    },
    // 编辑结束
    editOver (data, isSave) {
      // 设置节点为普通文本
      this.$delete(data, 'in-input-type')
      // 是否保存节点
      if (isSave) {
        // 设置节点文本
        const values = this.editInputs.map((_, index) => {
          const editInputMapIndex = this.editInputMap[index]
          let value = editInputMapIndex.value
          return !index ? value : (value ? `(${value})` : '')
        })
        data[[this.defaultProps.label]] = values.join('')
        // 更新新增的节点id为老节点
        if (typeof data[this.nodeKey] === 'string') { data[this.nodeKey] = data[this.nodeKey].replace('temp', '') }
      }
      // 清除记录的操作节点信息
      this.clearRecordNode()
    },
    // 新增节点
    addNode (data, node) {
      // 判断是否有正在编辑的节点
      this.isInOperation(() => {
        // 初始化inputs
        this.editInputs.forEach((_, index) => {
          const editInputMapIndex = this.editInputMap[index]
          editInputMapIndex.value = editInputMapIndex.validateError = ''
        })
        const newData = TreeCtrl.createNode()
        const newNode = !data ? this.$refs.infiniteTreeRef.root : node
        // 获取子节点
        const childNode = newNode.childNodes[0]
        // 添加节点
        if (childNode) {
          this.insertBefore(newData, childNode)
        } else {
          this.append(newData, newNode)
        }
        // 记录节点
        this.peerOperationNodes = newNode.childNodes
        this.operationNode = newNode.childNodes[0]
        if (data) {
          // 添加子节点时，展开当前节点
          node.expanded = true
        }

        // 将新增节点数据暴露出去
        this.$emit('addNode', data || newNode)
      })
    },
    // 新增根节点
    addRootNode () {
      this.addNode()
    },
    // 取消节点操作
    cancelNode (data, node) {
      // 新增时取消
      if (TreeCtrl.isAddCancel(data)) {
        this.delSelect(data, node, false) // 移除节点
      } else {
        // 编辑时取消
        this.editOver(data)
      }
    },
    // 编辑节点
    editNode (data, node) {
      // 判断是否有正在编辑的节点
      this.isInOperation(() => {
        this.$set(data, 'in-input-type', 'input')
        // 获取分割后的labels
        const labels = this.getSplitNames(data[this.defaultProps.label])
        this.editInputs.forEach((_, index) => {
          const editInputMapIndex = this.editInputMap[index]
          // 初始化label对应到输入框
          editInputMapIndex.value = labels[index]
          // 初始化错误信息
          editInputMapIndex.validateError = ''
        })
        // 设置正在编辑的节点中
        this.operationNode = node
        this.$emit('editNode', data)
      })
    },
    // 确认节点
    confirmNode (data, node) {
      // 假设验证通过
      let flag = false
      // 遍历复数输入框
      this.editInputs.forEach((e, index) => {
        const editInputMapIndex = this.editInputMap[index]
        // 判断节点是否需要校验
        if (e.validateFun && !e.hidden) {
          // 获取校验后的错误信息
          editInputMapIndex.validateError = e.validateFun(editInputMapIndex.value)
          if (editInputMapIndex.validateError) {
            flag = true
          }
        }
      })
      // 阻止代码流程
      if (flag) return
      // 遍历复数输入框
      this.editInputs.forEach((e, index) => {
        // 判断节点是否需要校验重名(存在同名错误信息 + 改节点没有被hidden掉 + 假设验证通过)
        if (e.sameNameError && !e.hidden && !flag) {
          const editInputMapIndex = this.editInputMap[index]
          // 获取同级节点
          let nodeDatas = []
          if (!e.sameNameValiMode || e.sameNameValiMode === 'local') {
            // 获取同级节点
            nodeDatas = node.parent.data[this.defaultProps.children] || node.parent.data
          } else if (e.sameNameValiMode === 'overall') {
            // 获取所有节点
            nodeDatas = jsonFlat(this.$refs.infiniteTreeRef.root.data)
          }
          // 同名校验
          for (let p = 0; p < nodeDatas.length; p++) {
            const item = nodeDatas[p]
            // 节点名称重名判断
            if (this.getSplitNames(item[this.defaultProps.label])[index] === editInputMapIndex.value && item[this.nodeKey] !== data[this.nodeKey]) {
              // 设置错误信息
              editInputMapIndex.validateError = e.sameNameError
              flag = true
              break
            }
          }
        }
      })
      // 阻止代码流程
      if (flag) return

      // 编辑结束
      this.editOver(data, true)
      this.$emit('handlerSave', data)
    },
    // 删除节点
    delSelect (data, node, isOldData) {
      // 垃圾收集器
      this.dustbin = {
        parent: node.parent,
        nextSibling: node.nextSibling,
        previousSibling: node.previousSibling,
        data: node.data
      }
      // 删除节点
      this.remove(node)
      // 清除记录的操作节点信息
      this.clearRecordNode()
      // 删除的是已创建存的节点时，emit删除完成方法
      isOldData && this.$emit('handlerDelete', this.operationNode)
    },
    // 撤销删除，目前仅支持撤销上一次删除的内容
    revocationDel () {
      if (this.dustbin) {
        const { parent, data, nextSibling, previousSibling } = this.dustbin
        if (nextSibling) {
          this.insertBefore(data, nextSibling)
        } else if (previousSibling) {
          this.insertAfter(data, previousSibling)
        } else {
          this.append(data, parent)
        }
      }
      this.dustbin = null
    }
  }
}