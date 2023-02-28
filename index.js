const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const { stderr } = require("process");

const app = express();
const port = 5000;

app.use(express.static("public/uploads"));

const uploadsDir = "public/uploads";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const videoFilter = function (req, file, cb) {
  const ext = path.extname(file.originalname);

  if (
    ext !== ".mp4" &&
    ext !== ".avi" &&
    ext !== ".flv" &&
    ext !== ".wmv" &&
    ext !== ".mov" &&
    ext !== ".mkv" &&
    ext !== ".gif" &&
    ext !== ".m4v"
  ) {
    return cb("This extension is not supported");
  }

  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: videoFilter,
  limits: { fileSize: 10000 * 1024 * 1024 }, // 10GB
}).single("video");

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.post("/form-submit", (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      console.log(err);
      return;
    }

    const outputFileName =
      "output-" + Date.now() + path.extname(req.file.originalname);

    exec(
      `ffmpeg -y -i public/uploads/${req.file.filename} -i play-icon.png -filter_complex "[0]drawbox=x=0:y=ih-h:w=iw:h=240:color=maroon:t=fill[a]; [a]drawtext=fontfile=OpenSans-Bold.ttf:text='Hi ${req.body.text}':fontcolor=white:fontsize=60:x=(w-tw)/2:y=h-120-(th/2)[b]; [b][1]overlay=(W/2)-64:(H/2)-64" -codec:a copy public/uploads/${outputFileName}`,
      (err, stderr, stdout) => {
        if (err) {
          console.log("ffmpeg error : ", err);
          return res.status(500).json({
            message: "Internal Server Error",
          });
        }

        // send back the generated output file name
        res.status(200).json({
          outputFileName,
        });

        // delete uploaded input file, as now it is of no use
        fs.unlinkSync(
          path.join(__dirname, "/public/uploads", req.file.filename)
        );
      }
    );
  });
});

app.get("/download", (req, res) => {
  const fullOutputPath = path.join(
    __dirname,
    "/public/uploads",
    req.query.file
  );

  res.download(fullOutputPath, (err) => {
    // delete the output file from server after output file downloaded on client side
    fs.unlinkSync(fullOutputPath);

    if (err) {
      res.send(err);
    }
  });
});

app.listen(port, () => console.log("Server started"));
