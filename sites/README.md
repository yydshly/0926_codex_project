# 网页展示

这里预留给子项目的独立静态网页。一个子项目对应一个与研究目录同名的子目录，例如：

```text
projects/001-example/README.md
sites/001-example/index.html
```

网页应使用相对路径引用自身资源，便于日后统一发布到 GitHub Pages 的子路径。网页首页提供返回总项目索引的入口；总 README 和子项目 README 则链接到相应展示页。

当前没有已发布网页。首次发布时，再根据实际网页使用的构建方式配置 GitHub Actions，将此目录作为 Pages 发布内容，并填写真实网址。
