# Visual harness

`npm test` cannot answer "does the graph look right" — it has no browser and
no eyes. These pages mount a component against fixture data so a person, or a
screenshot, can.

They are deliberately outside `npm test`: they need a network (React and
d3-force come from a CDN through an import map) and a server, and a suite that
sometimes fails for want of either teaches people to ignore it.

```
npm run build
python3 -m http.server 4800
open http://localhost:4800/tests/visual/graph.html
```

**graph.html** — six crates, one of which arrived at this commit along with
two of its edges. The thing to look at is that exactly one node and two edges
are in the warning colour and the legend agrees with them.
