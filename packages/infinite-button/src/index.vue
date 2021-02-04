
<script>
import ElButton from 'element-ui/lib/button'
export default {
  name: 'InfiniteButton',
  inheritAttrs: false,
  components: {
    ElButton
  },
  props: {
    size: {
      type: String,
      default: 'small'
    }
  },
  methods: {
    // 向上递归查找button DOM
    recursionSetBtnRmFocus (target) {
      if (target.nodeName === 'BUTTON') {
        target.blur()
      } else {
        this.recursionSetBtnRmFocus(target.parentNode)
      }
    },
    handleClick (e) {
      this.recursionSetBtnRmFocus(e.target)
      this.$emit('click', e)
    }
  },
  render (h) {
    return h('el-button', {
      class: [
        'infinite-button'
      ],
      props: {
        ...this.$attrs,
        size: this.size
      },
      nativeOn: {
        click: this.handleClick
      }
    }, [this.$slots.default])
  }
}
</script>
