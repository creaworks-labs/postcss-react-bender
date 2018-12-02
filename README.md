# PostCSS React Bender [![Build Status][ci-img]][ci]

[PostCSS] plugin to process react-bender styling features with scss like syntax..

[PostCSS]: https://github.com/postcss/postcss
[ci-img]:  https://travis-ci.org/omerduzyol/postcss-react-bender.svg
[ci]:      https://travis-ci.org/omerduzyol/postcss-react-bender

### Input Style

```css
#Screen {
  font-size: 25;

  .square {
    margin-top: 10px;
    width: 25;
    height: 55;
    background-color: 'yellow';
    align-items: 'center';
    justify-content: 'center';
  }

  #View {
    width: 100;
    height: 50;
    background-color: 'red';
  }

  #Text.underline {
    text-decoration: underline;
    font-size: 20px;
  }
}

#Text {
  .underline {
    text-decoration: underline;
  }
}
```

### Output Bender
```json
{
  "Screen": {
    ".square": {
      "alignItems": "center",
      "backgroundColor": "yellow",
      "height": 55,
      "justifyContent": "center",
      "marginTop": "10pt",
      "width": 25,
    },
    "Text.underline": {
      "fontSize": 20,
      "textDecorationColor": "black",
      "textDecorationLine": "underline",
      "textDecorationStyle": "solid",
    },
    "View": {
      "backgroundColor": "red",
      "height": 50,
      "width": 100,
    },
    "fontSize": 25,
  },
  "Text": {
    ".underline": {
      "textDecorationColor": "black",
      "textDecorationLine": "underline",
      "textDecorationStyle": "solid",
    },
  },
}
```

## General Usage

```js
postcss([ require('postcss-react-bender') ])
    .process(srcFile)
    .then(result => {
        console.log('Transformed', result.bender)
    })
```

## ReactNative Usage
Please refer to transformer options *react-bender* repository.

See [PostCSS] docs for examples for your environment.
