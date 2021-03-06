import * as sentenceController from "@/server/controller/sentenceController";

export default {
  props: ["item", "mode"],

  methods: {
    save() {
      return sentenceController.save(this.item);
    },
    delete() {
      return sentenceController.del(this.item.id);
    },
    handleDeleteClick() {
      this.$confirm("Confirm to delete?", "Note", {
        type: "warning"
      })
        .then(() => {
          this.delete().then(() => {
            this.$emit("delete");
            this.$message({
              type: "success",
              message: "Delete successfully!"
            });
          });
        })
        .catch(() => {});
    }
  }
};